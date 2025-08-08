import type { IGameRepository } from '../data/repositories/gameRepository';
import type { IPromptCardRepository } from '../data/repositories/promptCardRepository';
import type { GameSnapshot, PromptCard, AiConnection } from '../models';
import { formatIsoDateForDisplay } from '../utils/formatDate';
import { generateUuid } from '../utils/uuid';
import type { ITurnProcessor } from './ITurnProcessor';
import type { ISnapshotUpdater } from './ISnapshotUpdater';
import { debugLog, errorLog } from '../utils/debug';

/**
 * Defines the contract for the stateless GameSession service.
 * Its purpose is to calculate game state transitions, not to hold state itself.
 */
export interface IGameSession {
  initializeGame(userId: string, card: PromptCard): GameSnapshot;
  processPlayerAction(
    snapshot: GameSnapshot,
    card: PromptCard,
    action: string,
    useDummyNarrator: boolean,
    aiConnections: AiConnection[]
  ): Promise<GameSnapshot>;

  renameWorldCategory(snapshot: GameSnapshot, oldName: string, newName: string): GameSnapshot;
  renameWorldEntity(snapshot: GameSnapshot, category: string, oldName: string, newName: string): GameSnapshot;
  deleteWorldCategory(snapshot: GameSnapshot, category: string): GameSnapshot;
  deleteWorldEntity(snapshot: GameSnapshot, category: string, entity: string): GameSnapshot;
  editWorldKeyValue(snapshot: GameSnapshot, key: string, value: any): GameSnapshot;
  deleteWorldKey(snapshot: GameSnapshot, key: string): GameSnapshot;
  toggleWorldStatePin(snapshot: GameSnapshot, keyPath: string, type: 'variable' | 'entity' | 'category'): GameSnapshot;
}

/**
 * A stateless service that calculates game state transitions.
 * It does not hold any internal state like currentSnapshot.
 */
export class GameSession implements IGameSession {
  constructor(
    private turnProcessor: ITurnProcessor,
    private snapshotUpdater: ISnapshotUpdater
  ) {
    debugLog('[gameSession.ts] Stateless GameSession service instantiated.');
  }

  public initializeGame(userId: string, card: PromptCard): GameSnapshot {
    debugLog(`[gameSession.ts] initializeGame: Creating new snapshot for User=${userId}, Card=${card.id}`);
    
    let initialWorldState = {};
    try {
      if (card.worldStateInit) {
        initialWorldState = JSON.parse(card.worldStateInit);
      }
    } catch (e) {
      errorLog("[gameSession.ts] initializeGame: Failed to parse worldStateInit JSON:", e);
      initialWorldState = {};
    }

    const now = new Date().toISOString();

    const initialSnapshot: GameSnapshot = {
      id: generateUuid(),
      userId: userId,
      promptCardId: card.id,
      title: `Game with ${card.title} - ${formatIsoDateForDisplay(now)}`,
      createdAt: now,
      updatedAt: now,
      currentTurn: 0,
      gameState: {
        narration: card.firstTurnOnlyBlock,
        worldState: initialWorldState,
        scene: { location: null, present: [] },
      },
      conversationHistory: [
        { role: 'assistant', content: card.firstTurnOnlyBlock },
      ],
      logs: [],
      worldStatePinnedKeys: [],
    };

    debugLog(`[gameSession.ts] initializeGame: NEW game initialized with ID ${initialSnapshot.id}.`);
    return initialSnapshot;
  }

  public async processPlayerAction(
    snapshot: GameSnapshot,
    card: PromptCard,
    action: string,
    useDummyNarrator: boolean,
    aiConnections: AiConnection[]
  ): Promise<GameSnapshot> {
    debugLog(`[gameSession.ts] processPlayerAction: Starting for action: "${action.substring(0, 50)}..." on snapshot ${snapshot.id}`);

    if (!snapshot || !card) {
      errorLog('[gameSession.ts] processPlayerAction: Snapshot or Card is missing.');
      throw new Error("Cannot process player action: Snapshot and Card are required.");
    }

    const isFirstPlayerAction = snapshot.currentTurn === 0 && snapshot.logs.length === 0;

    const turnResult = await this.turnProcessor.processPlayerTurn(
      snapshot.userId,
      card,
      snapshot.gameState,
      snapshot.logs,
      snapshot.conversationHistory,
      action,
      snapshot.currentTurn,
      useDummyNarrator,
      aiConnections,
      isFirstPlayerAction
    );

    debugLog('[gameSession.ts] processPlayerAction: Calling snapshotUpdater to apply turn result.');
    const newSnapshot = this.snapshotUpdater.applyTurnResultToSnapshot(snapshot, {
      ...turnResult,
      playerAction: action,
    });

    debugLog(`[gameSession.ts] processPlayerAction: new snapshot ${newSnapshot.id} created.`);
    return newSnapshot;
  }

  public renameWorldCategory(snapshot: GameSnapshot, oldName: string, newName: string): GameSnapshot {
    return this.snapshotUpdater.applyCategoryRename(snapshot, oldName, newName);
  }

  public renameWorldEntity(snapshot: GameSnapshot, category: string, oldName: string, newName: string): GameSnapshot {
    return this.snapshotUpdater.applyEntityRename(snapshot, category, oldName, newName);
  }

  public deleteWorldCategory(snapshot: GameSnapshot, category: string): GameSnapshot {
    return this.snapshotUpdater.applyCategoryDelete(snapshot, category);
  }

  public deleteWorldEntity(snapshot: GameSnapshot, category: string, entity: string): GameSnapshot {
    return this.snapshotUpdater.applyEntityDelete(snapshot, category, entity);
  }

  public editWorldKeyValue(snapshot: GameSnapshot, key: string, value: any): GameSnapshot {
    return this.snapshotUpdater.applyKeyValueEdit(snapshot, key, value);
  }

  public deleteWorldKey(snapshot: GameSnapshot, key: string): GameSnapshot {
    return this.snapshotUpdater.applyKeyDelete(snapshot, key);
  }

  public toggleWorldStatePin(snapshot: GameSnapshot, keyPath: string, type: 'variable' | 'entity' | 'category'): GameSnapshot {
    return this.snapshotUpdater.applyPinToggle(snapshot, keyPath, type);
  }
}
