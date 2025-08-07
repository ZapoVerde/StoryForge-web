// src/logic/gameSession.ts
import type { IGameRepository } from '../data/repositories/gameRepository';
import type { IPromptCardRepository } from '../data/repositories/promptCardRepository';
import type { GameSnapshot, GameState, LogEntry, Message, PromptCard } from '../models';
import { formatIsoDateForDisplay } from '../utils/formatDate';
import { generateUuid } from '../utils/uuid';
import type { ITurnProcessor } from './ITurnProcessor';
import type { ISnapshotUpdater } from './ISnapshotUpdater';

export interface IGameSession {
  initializeGame(userId: string, cardId: string, existingSnapshotId?: string): Promise<void>;
  processPlayerAction(action: string, useDummyNarrator: boolean): Promise<GameSnapshot>;
  processFirstNarratorTurn(useDummyNarrator: boolean): Promise<GameSnapshot>;
  getCurrentGameSnapshot(): GameSnapshot | null;
  saveGame(snapshot: GameSnapshot): Promise<void>;
  loadGame(userId: string, snapshotId: string): Promise<void>;
  loadLastActiveGame(userId: string): Promise<boolean>;
  getCurrentPromptCard(): PromptCard | null;
  getCurrentGameState(): GameState | null;
  getGameLogs(): LogEntry[];
  gameRepo: IGameRepository;
  renameWorldCategory(oldName: string, newName: string): Promise<GameSnapshot | null>;
  renameWorldEntity(category: string, oldName: string, newName: string): Promise<GameSnapshot | null>;
  deleteWorldCategory(category: string): Promise<GameSnapshot | null>;
  deleteWorldEntity(category: string, entity: string): Promise<GameSnapshot | null>;
  editWorldKeyValue(key: string, value: any): Promise<GameSnapshot | null>;
  deleteWorldKey(key: string): Promise<GameSnapshot | null>;
  toggleWorldStatePin(keyPath: string, type: 'variable' | 'entity' | 'category'): Promise<GameSnapshot | null>;
}

export class GameSession implements IGameSession {
  private currentUserId: string | null = null;
  private currentSnapshot: GameSnapshot | null = null;
  private currentPromptCard: PromptCard | null = null;

  constructor(
    public gameRepo: IGameRepository,
    private cardRepo: IPromptCardRepository,
    private turnProcessor: ITurnProcessor,
    private snapshotUpdater: ISnapshotUpdater
  ) {
    console.log('[gameSession.ts] GameSession constructor called.');
  }

  public async initializeGame(userId: string, cardId: string, existingSnapshotId?: string): Promise<void> {
    console.log(`[gameSession.ts] initializeGame: Starting for User=${userId}, Card=${cardId}, Snapshot=${existingSnapshotId || 'new'}`);
    this.currentUserId = userId;

    if (existingSnapshotId) {
      await this.loadGame(userId, existingSnapshotId);
      console.log(`[gameSession.ts] initializeGame: Loaded existing game ${existingSnapshotId}.`);
      return;
    }

    const card = await this.cardRepo.getPromptCard(userId, cardId);
    if (!card) {
      console.error(`[gameSession.ts] initializeGame: PromptCard with ID ${cardId} not found.`);
      throw new Error(`PromptCard with ID ${cardId} not found.`);
    }
    this.currentPromptCard = card;

    let initialWorldState = {};
    try {
      // Fix: Ensure that if card.worldStateInit is an empty string, it defaults to an empty object
      if (card.worldStateInit) {
        initialWorldState = JSON.parse(card.worldStateInit);
      } else {
        initialWorldState = {}; // Explicitly set to empty object if string is empty
      }
    } catch (e) {
      console.error("[gameSession.ts] initializeGame: Failed to parse worldStateInit JSON:", e);
      // Fallback to empty object if parsing fails
      initialWorldState = {};
    }
    
    const now = new Date().toISOString();
    const firstTurnProse = card.firstTurnOnlyBlock || "The story begins...";

    const initialSnapshot: GameSnapshot = {
      id: generateUuid(),
      userId: userId,
      promptCardId: cardId,
      title: `Game with ${card.title} - ${formatIsoDateForDisplay(now)}`,
      createdAt: now,
      updatedAt: now,
      currentTurn: 0,
      gameState: {
        narration: firstTurnProse,
        worldState: initialWorldState,
        scene: { location: null, present: [] },
      },
      conversationHistory: [{ role: 'assistant', content: firstTurnProse }],
      logs: [],
      worldStatePinnedKeys: [],
    };

    this.currentSnapshot = initialSnapshot;
    console.log(`%c[gameSession.ts] initializeGame: NEW game initialized with ID ${initialSnapshot.id}. currentSnapshot set.`, 'color: green;');
  }

  public async processFirstNarratorTurn(useDummyNarrator: boolean): Promise<GameSnapshot> {
    console.log('[gameSession.ts] processFirstNarratorTurn: Starting.');
    if (!this.currentSnapshot || !this.currentUserId || !this.currentPromptCard) {
      console.error('[gameSession.ts] processFirstNarratorTurn: Prerequisites missing.');
      throw new Error("Cannot process first turn: Game not initialized correctly.");
    }
    
    const aiConnections = await this.gameRepo.getAiConnections(this.currentUserId);
    console.log(`[gameSession.ts] processFirstNarratorTurn: Calling turnProcessor.useDummyNarrator=${useDummyNarrator}.`);
    const turnResult = await this.turnProcessor.processFirstTurnNarratorResponse(
      this.currentUserId,
      this.currentPromptCard,
      this.currentSnapshot.gameState,
      useDummyNarrator,
      aiConnections
    );

    console.log('[gameSession.ts] processFirstNarratorTurn: Calling snapshotUpdater.applyTurnResultToSnapshot.');
    const newSnapshot = this.snapshotUpdater.applyTurnResultToSnapshot(this.currentSnapshot, turnResult);
    
    this.currentSnapshot = newSnapshot;
    console.log(`[gameSession.ts] processFirstNarratorTurn: newSnapshot ${newSnapshot.id} applied. Saving game...`);
    await this.saveGame(newSnapshot);
    console.log('[gameSession.ts] processFirstNarratorTurn: Finished and saved.');
    return newSnapshot;
  }

  public async processPlayerAction(action: string, useDummyNarrator: boolean): Promise<GameSnapshot> {
    console.log(`[gameSession.ts] processPlayerAction: Starting for action: "${action.substring(0, 50)}..."`);
    if (!this.currentSnapshot || !this.currentUserId || !this.currentPromptCard) {
      console.error('[gameSession.ts] processPlayerAction: Prerequisites missing.');
      throw new Error("Cannot process player action: Game not initialized correctly.");
    }

    const aiConnections = await this.gameRepo.getAiConnections(this.currentUserId);
    console.log(`[gameSession.ts] processPlayerAction: Calling turnProcessor.useDummyNarrator=${useDummyNarrator}.`);
    const turnResult = await this.turnProcessor.processPlayerTurn(
      this.currentUserId,
      this.currentPromptCard,
      this.currentSnapshot.gameState,
      this.currentSnapshot.logs,
      this.currentSnapshot.conversationHistory,
      action,
      this.currentSnapshot.currentTurn,
      useDummyNarrator,
      aiConnections
    );
    
    console.log('[gameSession.ts] processPlayerAction: Calling snapshotUpdater.applyTurnResultToSnapshot.');
    const newSnapshot = this.snapshotUpdater.applyTurnResultToSnapshot(this.currentSnapshot, { ...turnResult, playerAction: action });
    
    this.currentSnapshot = newSnapshot;
    console.log(`[gameSession.ts] processPlayerAction: newSnapshot ${newSnapshot.id} applied. Saving game...`);
    await this.saveGame(newSnapshot);
    console.log('[gameSession.ts] processPlayerAction: Finished and saved.');
    return newSnapshot;
  }

  private async updateAndSave(updater: (snapshot: GameSnapshot) => GameSnapshot): Promise<GameSnapshot | null> {
    console.log(`[gameSession.ts] updateAndSave: Applying update and saving. currentSnapshot before update: ${this.currentSnapshot?.id || 'null'}`);
    if (!this.currentSnapshot) {
      console.warn('[gameSession.ts] updateAndSave: No currentSnapshot to update. Returning null.');
      return null;
    }
    
    const newSnapshot = updater(this.currentSnapshot);
    this.currentSnapshot = newSnapshot;
    console.log(`[gameSession.ts] updateAndSave: currentSnapshot updated to ${this.currentSnapshot.id}. Persisting...`);
    await this.saveGame(newSnapshot);
    console.log('[gameSession.ts] updateAndSave: Persisted successfully.');
    return newSnapshot;
  }

  public async renameWorldCategory(oldName: string, newName: string): Promise<GameSnapshot | null> {
    return this.updateAndSave(snap => this.snapshotUpdater.applyCategoryRename(snap, oldName, newName));
  }

  public async renameWorldEntity(category: string, oldName: string, newName: string): Promise<GameSnapshot | null> {
    return this.updateAndSave(snap => this.snapshotUpdater.applyEntityRename(snap, category, oldName, newName));
  }

  public async deleteWorldCategory(category: string): Promise<GameSnapshot | null> {
    return this.updateAndSave(snap => this.snapshotUpdater.applyCategoryDelete(snap, category));
  }

  public async deleteWorldEntity(category: string, entity: string): Promise<GameSnapshot | null> {
    return this.updateAndSave(snap => this.snapshotUpdater.applyEntityDelete(snap, category, entity));
  }

  public async editWorldKeyValue(key: string, value: any): Promise<GameSnapshot | null> {
    return this.updateAndSave(snap => this.snapshotUpdater.applyKeyValueEdit(snap, key, value));
  }

  public async deleteWorldKey(key: string): Promise<GameSnapshot | null> {
    return this.updateAndSave(snap => this.snapshotUpdater.applyKeyDelete(snap, key));
  }

  public async toggleWorldStatePin(keyPath: string, type: 'variable' | 'entity' | 'category'): Promise<GameSnapshot | null> {
    console.log(`[gameSession.ts] toggleWorldStatePin: Toggling pin for ${type} at path "${keyPath}".`);
    return this.updateAndSave(snap => this.snapshotUpdater.applyPinToggle(snap, keyPath, type));
  }

  public async loadGame(userId: string, snapshotId: string): Promise<void> {
    console.log(`[gameSession.ts] loadGame: Attempting to load snapshot ${snapshotId} for user ${userId}.`);
    const snapshot = await this.gameRepo.getGameSnapshot(userId, snapshotId);
    if (!snapshot) {
      console.error(`[gameSession.ts] loadGame: Snapshot ${snapshotId} not found.`);
      throw new Error(`Game snapshot ${snapshotId} not found.`);
    }
    const card = await this.cardRepo.getPromptCard(userId, snapshot.promptCardId);
    if (!card) {
      console.error(`[gameSession.ts] loadGame: PromptCard ${snapshot.promptCardId} not found for loaded game.`);
      throw new Error(`PromptCard ${snapshot.promptCardId} not found.`);
    }
    
    this.currentUserId = userId;
    this.currentSnapshot = snapshot;
    this.currentPromptCard = card;
    console.log(`%c[gameSession.ts] loadGame: Successfully loaded snapshot ${snapshot.id} and card ${card.id}. currentSnapshot set.`, 'color: green;');
  }

  public async loadLastActiveGame(userId: string): Promise<boolean> {
    console.log(`[gameSession.ts] loadLastActiveGame: Checking for last active game for user ${userId}.`);
    const allSnapshots = await this.gameRepo.getAllGameSnapshots(userId);
    if (allSnapshots.length > 0) {
      console.log(`[gameSession.ts] loadLastActiveGame: Found ${allSnapshots.length} snapshots. Loading most recent: ${allSnapshots[0].id}.`);
      await this.loadGame(userId, allSnapshots[0].id);
      console.log('[gameSession.ts] loadLastActiveGame: Finished loading last active game. Returning true.');
      return true;
    }
    console.log('[gameSession.ts] loadLastActiveGame: No last active game found. Returning false.');
    return false;
  }

  public async saveGame(snapshot: GameSnapshot): Promise<void> {
    console.log(`[gameSession.ts] saveGame: Attempting to save snapshot ${snapshot.id}.`);
    if (!this.currentUserId) {
      console.error('[gameSession.ts] saveGame: User not initialized during save. Throwing error.');
      throw new Error("User not initialized.");
    }
    await this.gameRepo.saveGameSnapshot(this.currentUserId, snapshot);
    console.log(`[gameSession.ts] saveGame: Snapshot ${snapshot.id} saved successfully.`);
  }

  public getCurrentGameSnapshot = () => {
    // DEBUG: Log currentSnapshot getter access
    // console.log(`[gameSession.ts] getCurrentGameSnapshot: returning ${this.currentSnapshot?.id || 'null'}.`);
    return this.currentSnapshot;
  };
  public getCurrentPromptCard = () => this.currentPromptCard;
  public getCurrentGameState = () => this.currentSnapshot?.gameState || null;
  public getGameLogs = () => this.currentSnapshot?.logs || [];
}