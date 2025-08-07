// src/logic/gameSession.ts
import type { IGameRepository } from '../data/repositories/gameRepository';
import type { IPromptCardRepository } from '../data/repositories/promptCardRepository';
import type { GameSnapshot, GameState, LogEntry, PromptCard } from '../models';
import { formatIsoDateForDisplay } from '../utils/formatDate';
import { generateUuid } from '../utils/uuid';
import type { ITurnProcessor } from './ITurnProcessor';
import type { ISnapshotUpdater } from './ISnapshotUpdater';

// NOTE: The IGameSession interface remains UNCHANGED, so it won't break the store.
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
}

export class GameSession implements IGameSession {
  private currentUserId: string | null = null;
  private currentSnapshot: GameSnapshot | null = null;
  private currentPromptCard: PromptCard | null = null;

  constructor(
    public gameRepo: IGameRepository, // Keep public for settings screen
    private cardRepo: IPromptCardRepository,
    private turnProcessor: ITurnProcessor,
    private snapshotUpdater: ISnapshotUpdater
  ) {}

  public async initializeGame(userId: string, cardId: string, existingSnapshotId?: string): Promise<void> {
    console.log(`GameSession: Initializing game. User: ${userId}, Card: ${cardId}, Snapshot: ${existingSnapshotId}`);
    this.currentUserId = userId;

    if (existingSnapshotId) {
      await this.loadGame(userId, existingSnapshotId);
      return;
    }

    const card = await this.cardRepo.getPromptCard(userId, cardId);
    if (!card) throw new Error(`PromptCard with ID ${cardId} not found.`);
    this.currentPromptCard = card;

    let initialWorldState = {};
    try {
      if (card.worldStateInit) initialWorldState = JSON.parse(card.worldStateInit);
    } catch (e) {
      console.error("Failed to parse worldStateInit JSON:", e);
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
    console.log(`GameSession: New game initialized with ID ${initialSnapshot.id}.`);
  }

  public async processFirstNarratorTurn(useDummyNarrator: boolean): Promise<GameSnapshot> {
    if (!this.currentSnapshot || !this.currentUserId || !this.currentPromptCard) {
      throw new Error("Cannot process first turn: Game not initialized correctly.");
    }
    
    const aiConnections = await this.gameRepo.getAiConnections(this.currentUserId);
    const turnResult = await this.turnProcessor.processFirstTurnNarratorResponse(
      this.currentUserId,
      this.currentPromptCard,
      this.currentSnapshot.gameState,
      useDummyNarrator,
      aiConnections
    );

    const newSnapshot = this.snapshotUpdater.applyTurnResultToSnapshot(this.currentSnapshot, turnResult);
    
    this.currentSnapshot = newSnapshot;
    await this.saveGame(newSnapshot);
    return newSnapshot;
  }

  public async processPlayerAction(action: string, useDummyNarrator: boolean): Promise<GameSnapshot> {
    if (!this.currentSnapshot || !this.currentUserId || !this.currentPromptCard) {
      throw new Error("Cannot process player action: Game not initialized correctly.");
    }

    const aiConnections = await this.gameRepo.getAiConnections(this.currentUserId);
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
    
    const newSnapshot = this.snapshotUpdater.applyTurnResultToSnapshot(this.currentSnapshot, { ...turnResult, playerAction: action });
    
    this.currentSnapshot = newSnapshot;
    await this.saveGame(newSnapshot);
    return newSnapshot;
  }

  private async updateAndSave(updater: (snapshot: GameSnapshot) => GameSnapshot): Promise<GameSnapshot | null> {
    if (!this.currentSnapshot) return null;
    const newSnapshot = updater(this.currentSnapshot);
    this.currentSnapshot = newSnapshot;
    await this.saveGame(newSnapshot);
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

  // --- Loading, Saving, and Getters (Largely Unchanged) ---

  public async loadGame(userId: string, snapshotId: string): Promise<void> {
    const snapshot = await this.gameRepo.getGameSnapshot(userId, snapshotId);
    if (!snapshot) throw new Error(`Game snapshot ${snapshotId} not found.`);
    const card = await this.cardRepo.getPromptCard(userId, snapshot.promptCardId);
    if (!card) throw new Error(`PromptCard ${snapshot.promptCardId} not found.`);
    
    this.currentUserId = userId;
    this.currentSnapshot = snapshot;
    this.currentPromptCard = card;
  }

  public async loadLastActiveGame(userId: string): Promise<boolean> {
    const allSnapshots = await this.gameRepo.getAllGameSnapshots(userId);
    if (allSnapshots.length > 0) {
      await this.loadGame(userId, allSnapshots[0].id);
      return true;
    }
    return false;
  }

  public async saveGame(snapshot: GameSnapshot): Promise<void> {
    if (!this.currentUserId) throw new Error("User not initialized.");
    await this.gameRepo.saveGameSnapshot(this.currentUserId, snapshot);
  }

  public getCurrentGameSnapshot = () => this.currentSnapshot;
  public getCurrentPromptCard = () => this.currentPromptCard;
  public getCurrentGameState = () => this.currentSnapshot?.gameState || null;
  public getGameLogs = () => this.currentSnapshot?.logs || [];
}