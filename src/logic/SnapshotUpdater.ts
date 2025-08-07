// src/logic/SnapshotUpdater.ts
import { produce } from 'immer';
import type { GameSnapshot } from '../models';
import type { IGameStateManager } from './IGameStateManager';
import type { ISnapshotUpdater, ITurnResult } from './ISnapshotUpdater';
import { flattenJsonObject, getNestedValue } from '../utils/jsonUtils';

export class SnapshotUpdater implements ISnapshotUpdater {
  constructor(private gameStateManager: IGameStateManager) {}

  public applyTurnResultToSnapshot(snapshot: GameSnapshot, turnResult: ITurnResult): GameSnapshot {
    const { parsedOutput, logEntry, playerAction } = turnResult;

    return produce(snapshot, draft => {
      // 1. Apply deltas and scene changes to get the next game state
      let stateAfterDeltas = this.gameStateManager.applyDeltasToGameState(draft.gameState, parsedOutput.deltas);
      let finalGameState = this.gameStateManager.updateSceneState(stateAfterDeltas, parsedOutput.scene, parsedOutput.deltas);

      // 2. Update the narration within the new game state
      finalGameState.narration = parsedOutput.prose;
      draft.gameState = finalGameState;

      // 3. Update conversation history
      if (playerAction) {
        draft.conversationHistory.push({ role: 'user', content: playerAction });
      }
      draft.conversationHistory.push({ role: 'assistant', content: parsedOutput.prose });
      
      // 4. Add the new log entry
      draft.logs.push(logEntry);

      // 5. Increment turn and update timestamp
      draft.currentTurn += 1;
      draft.updatedAt = new Date().toISOString();
    });
  }

  public applyCategoryRename(snapshot: GameSnapshot, oldName: string, newName: string): GameSnapshot {
    return produce(snapshot, draft => {
      const { updatedWorldState, updatedPinnedKeys } = this.gameStateManager.renameCategory(
        draft.gameState.worldState,
        draft.worldStatePinnedKeys,
        oldName,
        newName
      );
      draft.gameState.worldState = updatedWorldState;
      draft.worldStatePinnedKeys = updatedPinnedKeys;
      draft.updatedAt = new Date().toISOString();
    });
  }

  public applyEntityRename(snapshot: GameSnapshot, category: string, oldName: string, newName: string): GameSnapshot {
    return produce(snapshot, draft => {
      const { updatedWorldState, updatedPinnedKeys } = this.gameStateManager.renameEntity(
        draft.gameState.worldState,
        draft.worldStatePinnedKeys,
        category,
        oldName,
        newName
      );
      draft.gameState.worldState = updatedWorldState;
      draft.worldStatePinnedKeys = updatedPinnedKeys;
      draft.updatedAt = new Date().toISOString();
    });
  }
  
  public applyCategoryDelete(snapshot: GameSnapshot, category: string): GameSnapshot {
     return produce(snapshot, draft => {
      const { updatedWorldState, updatedPinnedKeys } = this.gameStateManager.deleteCategory(
        draft.gameState.worldState,
        draft.worldStatePinnedKeys,
        category
      );
      draft.gameState.worldState = updatedWorldState;
      draft.worldStatePinnedKeys = updatedPinnedKeys;
      draft.updatedAt = new Date().toISOString();
    });
  }

  public applyEntityDelete(snapshot: GameSnapshot, category: string, entity: string): GameSnapshot {
     return produce(snapshot, draft => {
      const { updatedWorldState, updatedPinnedKeys } = this.gameStateManager.deleteEntity(
        draft.gameState.worldState,
        draft.worldStatePinnedKeys,
        category,
        entity
      );
      draft.gameState.worldState = updatedWorldState;
      draft.worldStatePinnedKeys = updatedPinnedKeys;
      draft.updatedAt = new Date().toISOString();
    });
  }

  public applyKeyValueEdit(snapshot: GameSnapshot, key: string, value: any): GameSnapshot {
     return produce(snapshot, draft => {
      draft.gameState.worldState = this.gameStateManager.editKeyValue(
        draft.gameState.worldState,
        key,
        value
      );
      draft.updatedAt = new Date().toISOString();
    });
  }

  public applyKeyDelete(snapshot: GameSnapshot, key: string): GameSnapshot {
     return produce(snapshot, draft => {
      const { updatedWorldState, updatedPinnedKeys } = this.gameStateManager.deleteKey(
        draft.gameState.worldState,
        draft.worldStatePinnedKeys,
        key
      );
      draft.gameState.worldState = updatedWorldState;
      draft.worldStatePinnedKeys = updatedPinnedKeys;
      draft.updatedAt = new Date().toISOString();
    });
  }

  public applyPinToggle(snapshot: GameSnapshot, keyPath: string, type: 'variable' | 'entity' | 'category'): GameSnapshot {
    return produce(snapshot, draft => {
      const currentWorldState = draft.gameState.worldState || {};
      const currentPinnedKeys = draft.worldStatePinnedKeys || [];
      const newPinnedKeys = new Set(currentPinnedKeys);

      const getAllChildVariableKeys = (basePath: string): string[] => {
        const nestedData = getNestedValue(currentWorldState, basePath.split('.'));
        if (typeof nestedData !== 'object' || nestedData === null) return [];
        return Object.keys(flattenJsonObject(nestedData, basePath));
      };

      let relevantKeysToToggle: string[] = [];
      if (type === 'variable') {
        relevantKeysToToggle = [keyPath];
      } else { // 'entity' or 'category'
        relevantKeysToToggle = getAllChildVariableKeys(keyPath);
      }

      const shouldPin = relevantKeysToToggle.length > 0 && !relevantKeysToToggle.every(key => newPinnedKeys.has(key));

      relevantKeysToToggle.forEach(key => {
        if (shouldPin) {
          newPinnedKeys.add(key);
        } else {
          newPinnedKeys.delete(key);
        }
      });

      draft.worldStatePinnedKeys = Array.from(newPinnedKeys).sort(); // Sort for consistency
      draft.updatedAt = new Date().toISOString();
    });
  }
}