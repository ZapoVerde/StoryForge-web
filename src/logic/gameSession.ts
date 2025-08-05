// src/logic/gameSession.ts

import { produce } from 'immer';
import { IGameRepository } from '../data/repositories/gameRepository';
import { IPromptCardRepository } from '../data/repositories/promptCardRepository';
import { AiConnection, GameSnapshot, GameState, LogEntry, Message, PromptCard } from '../models';
import { formatIsoDateForDisplay } from '../utils/formatDate';
import { generateUuid } from '../utils/uuid';
import { IAiClient } from './aiClient';
import { GameStateManager } from './GameStateManager';
import { IGameStateManager } from './IGameStateManager';
import { ILogManager } from './logManager';
import { IPromptBuilder } from './promptBuilder';
import { ITurnProcessor } from './ITurnProcessor';
import { TurnProcessor } from './TurnProcessor';


/**
 * Interface defining the contract for the Game Session manager.
 * Orchestrates the turn flow, handles player actions, calls AI, updates logs & saves.
 */
export interface IGameSession {
  initializeGame(userId: string, cardId: string, existingSnapshotId?: string): Promise<void>;
  processPlayerAction(action: string, useDummyNarrator: boolean): Promise<GameSnapshot>;
  processFirstNarratorTurn(useDummyNarrator: boolean): Promise<GameSnapshot>; // NEW: Returns updated snapshot

  getCurrentGameSnapshot(): GameSnapshot | null;
  saveGame(snapshot: GameSnapshot): Promise<void>;
  loadGame(userId: string, snapshotId: string): Promise<void>;
  loadLastActiveGame(userId: string): Promise<boolean>;

  getCurrentPromptCard(): PromptCard | null;
  getCurrentGameState(): GameState | null;
  getGameLogs(): LogEntry[];

  gameRepo: IGameRepository; // Exposed for loading AI connections

  // Delegated World State Modification Methods - now return updated snapshot
  renameWorldCategory(oldName: string, newName: string): Promise<GameSnapshot | null>;
  renameWorldEntity(category: string, oldName: string, newName: string): Promise<GameSnapshot | null>;
  deleteWorldCategory(category: string): Promise<GameSnapshot | null>;
  deleteWorldEntity(category: string, entity: string): Promise<GameSnapshot | null>;
  editWorldKeyValue(key: string, value: any): Promise<GameSnapshot | null>;
  deleteWorldKey(key: string): Promise<GameSnapshot | null>;
}

/**
 * Concrete implementation of IGameSession.
 */
export class GameSession implements IGameSession {
  private currentUserId: string | null = null;
  private currentSnapshot: GameSnapshot | null = null;
  private currentPromptCard: PromptCard | null = null;

  private gameStateManager: IGameStateManager; // NEW
  private turnProcessor: ITurnProcessor;       // NEW

  public gameRepo: IGameRepository; // Injected dependency

  constructor(
    private cardRepo: IPromptCardRepository,
    gameRepoInstance: IGameRepository,
    promptBuilder: IPromptBuilder,
    aiClient: IAiClient, // The real AI client
    logManager: ILogManager,
  ) {
    this.gameRepo = gameRepoInstance;
    this.gameStateManager = new GameStateManager(); // Instantiate GameStateManager
    this.turnProcessor = new TurnProcessor(aiClient, promptBuilder, logManager); // Instantiate TurnProcessor with its dependencies
  }

  public async initializeGame(userId: string, cardId: string, existingSnapshotId?: string): Promise<void> {
    console.log(`GameSession: Initializing game. User: ${userId}, Card: ${cardId}, Snapshot: ${existingSnapshotId}`);
    this.currentUserId = userId;

    if (existingSnapshotId) {
      await this.loadGame(userId, existingSnapshotId);
      return;
    }

    const card = await this.cardRepo.getPromptCard(userId, cardId);
    if (!card) {
      throw new Error(`PromptCard with ID ${cardId} not found for user ${userId}.`);
    }
    this.currentPromptCard = card;

    const now = new Date().toISOString();
    const newSnapshotId = generateUuid();

    let initialWorldState = {};
    try {
      if (card.worldStateInit) {
        initialWorldState = JSON.parse(card.worldStateInit);
      }
    } catch (e) {
      console.error("Failed to parse worldStateInit JSON:", e);
    }

    const firstTurnProse = card.firstTurnOnlyBlock || "The story begins...";

    const initialGameState: GameState = {
      narration: firstTurnProse,
      worldState: initialWorldState,
      scene: { location: null, present: [] },
    };

    const initialSnapshot: GameSnapshot = {
      id: newSnapshotId,
      userId: userId,
      promptCardId: cardId,
      title: `Game with ${card.title} - ${formatIsoDateForDisplay(now)}`,
      createdAt: now,
      updatedAt: now,
      currentTurn: 0,
      gameState: initialGameState,
      conversationHistory: [], // First turn response will be added
      logs: [],
      worldStatePinnedKeys: [],
    };

    this.currentSnapshot = initialSnapshot;
    // Don't save yet, let processFirstNarratorTurn handle the initial save.
    console.log(`GameSession: New game initialized with ID ${newSnapshotId}. Awaiting first narrator response.`);
  }

  public async processFirstNarratorTurn(useDummyNarrator: boolean): Promise<GameSnapshot> {
    if (!this.currentSnapshot || !this.currentUserId || !this.currentPromptCard) {
      throw new Error("Cannot process first turn: Game not initialized correctly.");
    }
    console.log("GameSession: Processing first narrator turn (Turn 0)...");

    const snapshot = this.currentSnapshot;
    const card = this.currentPromptCard;
    const userId = this.currentUserId;

    // Fetch AI connections for the turn processor
    const aiConnections = await this.gameRepo.getAiConnections(userId);

    const { parsedOutput, logEntry } = await this.turnProcessor.processFirstTurnNarratorResponse(
      userId,
      card,
      snapshot.gameState,
      useDummyNarrator,
      aiConnections,
    );

    // Update Game State using GameStateManager
    let newGameState = this.gameStateManager.applyDeltasToGameState(snapshot.gameState, parsedOutput.deltas);
    newGameState = this.gameStateManager.updateSceneState(newGameState, parsedOutput.scene, parsedOutput.deltas);

    // Update conversation history and add prose
    const updatedConversationHistory = [...snapshot.conversationHistory, { role: 'assistant', content: parsedOutput.prose }];
    
    // Create new snapshot with updated values
    const updatedSnapshot = produce(snapshot, draft => {
      draft.gameState = newGameState;
      draft.conversationHistory = updatedConversationHistory;
      draft.logs.push(logEntry);
      draft.currentTurn += 1; // Increment turn after processing it
      draft.updatedAt = new Date().toISOString();
    });

    this.currentSnapshot = updatedSnapshot;
    await this.saveGame(updatedSnapshot);
    console.log("GameSession: First turn processed and saved. Snapshot ID:", updatedSnapshot.id);
    return updatedSnapshot;
  }


  public async processPlayerAction(action: string, useDummyNarrator: boolean): Promise<GameSnapshot> {
    if (!this.currentSnapshot || !this.currentUserId || !this.currentPromptCard) {
      throw new Error("Cannot process player action: Game not initialized correctly.");
    }
    console.log(`GameSession: Processing player action for turn ${this.currentSnapshot.currentTurn}...`);

    const snapshot = this.currentSnapshot;
    const card = this.currentPromptCard;
    const userId = this.currentUserId;
    const turnNumber = snapshot.currentTurn;

    // Add player action to conversation history
    const conversationHistoryWithPlayerAction = [...snapshot.conversationHistory, { role: 'user', content: action }];

    // Fetch AI connections for the turn processor
    const aiConnections = await this.gameRepo.getAiConnections(userId);

    const { parsedOutput, logEntry } = await this.turnProcessor.processPlayerTurn(
      userId,
      card,
      snapshot.gameState,
      snapshot.logs,
      conversationHistoryWithPlayerAction, // Pass updated history
      action,
      turnNumber,
      useDummyNarrator,
      aiConnections,
    );

    // Update Game State using GameStateManager
    let newGameState = this.gameStateManager.applyDeltasToGameState(snapshot.gameState, parsedOutput.deltas);
    newGameState = this.gameStateManager.updateSceneState(newGameState, parsedOutput.scene, parsedOutput.deltas);

    // Update conversation history with assistant's response
    const updatedConversationHistory = [...conversationHistoryWithPlayerAction, { role: 'assistant', content: parsedOutput.prose }];

    // Create new snapshot with updated values
    const updatedSnapshot = produce(snapshot, draft => {
      draft.gameState = newGameState;
      draft.conversationHistory = updatedConversationHistory;
      draft.logs.push(logEntry);
      draft.currentTurn += 1; // Increment turn after processing it
      draft.updatedAt = new Date().toISOString();
    });

    this.currentSnapshot = updatedSnapshot;
    await this.saveGame(updatedSnapshot);

    return updatedSnapshot;
  }

  public async loadGame(userId: string, snapshotId: string): Promise<void> {
    console.log(`GameSession: Loading game snapshot ID ${snapshotId} for user ${userId}.`);

    const snapshot = await this.gameRepo.getGameSnapshot(userId, snapshotId);
    if (!snapshot) {
      throw new Error(`Game snapshot with ID ${snapshotId} not found for user ${userId}.`);
    }

    const card = await this.cardRepo.getPromptCard(userId, snapshot.promptCardId);
    if (!card) {
      throw new Error(`Associated PromptCard with ID ${snapshot.promptCardId} not found for snapshot ${snapshotId}.`);
    }

    this.currentUserId = userId;
    this.currentSnapshot = snapshot;
    this.currentPromptCard = card;

    console.log(`GameSession: Successfully loaded game "${snapshot.title}" and card "${card.title}".`);
  }

  public async loadLastActiveGame(userId: string): Promise<boolean> {
    try {
      const allSnapshots = await this.gameRepo.getAllGameSnapshots(userId);
      if (allSnapshots.length > 0) {
        const lastActiveSnapshot = allSnapshots[0];
        console.log(`GameSession: Found last active game: ${lastActiveSnapshot.id}. Loading...`);
        await this.loadGame(userId, lastActiveSnapshot.id);
        return true;
      }
      console.log("GameSession: No last active game found for user.");
      return false;
    } catch (error: any) {
      console.error("GameSession: Error loading last active game:", error);
      throw error;
    }
  }

  public async saveGame(snapshot: GameSnapshot): Promise<void> {
    if (!this.currentUserId) {
      console.error("GameSession: Cannot save game because userId is not set.");
      throw new Error("User is not initialized in the game session.");
    }
    if (!snapshot) {
      console.warn("GameSession: saveGame was called with an empty snapshot.");
      return;
    }

    try {
      await this.gameRepo.saveGameSnapshot(this.currentUserId, snapshot);
      console.log(`GameSession: Successfully saved snapshot ${snapshot.id}.`);
    } catch (e) {
      console.error(`GameSession: An error occurred while saving snapshot ${snapshot.id}.`, e);
      throw e;
    }
  }

  public getCurrentGameSnapshot(): GameSnapshot | null {
    return this.currentSnapshot;
  }

  public getCurrentPromptCard(): PromptCard | null {
    return this.currentPromptCard;
  }

  public getCurrentGameState(): GameState | null {
    return this.currentSnapshot?.gameState || null;
  }

  public getGameLogs(): LogEntry[] {
    return this.currentSnapshot?.logs || [];
  }

  // --- World State Modification Methods (Delegated to GameStateManager) ---

  private async updateCurrentSnapshotAndSave(mutator: (draft: GameSnapshot) => void): Promise<GameSnapshot | null> {
    if (!this.currentSnapshot || !this.currentUserId) {
      console.error("GameSession: Cannot modify world state, session not active.");
      return null;
    }

    const newSnapshot = produce(this.currentSnapshot, mutator);

    await this.gameRepo.saveGameSnapshot(this.currentUserId, newSnapshot);
    this.currentSnapshot = newSnapshot; // Update internal currentSnapshot
    return newSnapshot;
  }

  public async renameWorldCategory(oldName: string, newName: string): Promise<GameSnapshot | null> {
    return this.updateCurrentSnapshotAndSave(draft => {
      const { updatedWorldState, updatedPinnedKeys } = this.gameStateManager.renameCategory(
        draft.gameState.worldState,
        draft.worldStatePinnedKeys,
        oldName,
        newName
      );
      draft.gameState.worldState = updatedWorldState;
      draft.worldStatePinnedKeys = updatedPinnedKeys;
    });
  }

  public async renameWorldEntity(category: string, oldName: string, newName: string): Promise<GameSnapshot | null> {
    return this.updateCurrentSnapshotAndSave(draft => {
      const { updatedWorldState, updatedPinnedKeys } = this.gameStateManager.renameEntity(
        draft.gameState.worldState,
        draft.worldStatePinnedKeys,
        category,
        oldName,
        newName
      );
      draft.gameState.worldState = updatedWorldState;
      draft.worldStatePinnedKeys = updatedPinnedKeys;
    });
  }

  public async deleteWorldCategory(category: string): Promise<GameSnapshot | null> {
    return this.updateCurrentSnapshotAndSave(draft => {
      const { updatedWorldState, updatedPinnedKeys } = this.gameStateManager.deleteCategory(
        draft.gameState.worldState,
        draft.worldStatePinnedKeys,
        category
      );
      draft.gameState.worldState = updatedWorldState;
      draft.worldStatePinnedKeys = updatedPinnedKeys;
    });
  }

  public async deleteWorldEntity(category: string, entity: string): Promise<GameSnapshot | null> {
    return this.updateCurrentSnapshotAndSave(draft => {
      const { updatedWorldState, updatedPinnedKeys } = this.gameStateManager.deleteEntity(
        draft.gameState.worldState,
        draft.worldStatePinnedKeys,
        category,
        entity
      );
      draft.gameState.worldState = updatedWorldState;
      draft.worldStatePinnedKeys = updatedPinnedKeys;
    });
  }

  public async editWorldKeyValue(key: string, value: any): Promise<GameSnapshot | null> {
    return this.updateCurrentSnapshotAndSave(draft => {
      draft.gameState.worldState = this.gameStateManager.editKeyValue(
        draft.gameState.worldState,
        key,
        value
      );
    });
  }

  public async deleteWorldKey(key: string): Promise<GameSnapshot | null> {
    return this.updateCurrentSnapshotAndSave(draft => {
      const { updatedWorldState, updatedPinnedKeys } = this.gameStateManager.deleteKey(
        draft.gameState.worldState,
        draft.worldStatePinnedKeys,
        key
      );
      draft.gameState.worldState = updatedWorldState;
      draft.worldStatePinnedKeys = updatedPinnedKeys;
    });
  }
}