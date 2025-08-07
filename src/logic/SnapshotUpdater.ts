// src/logic/SnapshotUpdater.ts
import { produce } from 'immer';
import type { GameSnapshot } from '../models';
import type { IGameStateManager } from './IGameStateManager';
import type { ISnapshotUpdater, ITurnResult } from './ISnapshotUpdater';
import { flattenJsonObject, getNestedValue } from '../utils/jsonUtils';

export class SnapshotUpdater implements ISnapshotUpdater {
  constructor(private gameStateManager: IGameStateManager) {
    console.log('[SnapshotUpdater.ts] SnapshotUpdater constructor called.');
  }

  public applyTurnResultToSnapshot(snapshot: GameSnapshot, turnResult: ITurnResult): GameSnapshot {
    console.log(`[SnapshotUpdater.ts] applyTurnResultToSnapshot: Starting for snapshot ${snapshot.id}. Turn: ${snapshot.currentTurn}`);
    const { parsedOutput, logEntry, playerAction } = turnResult;

    const newSnapshot = produce(snapshot, draft => {
      let stateAfterDeltas = this.gameStateManager.applyDeltasToGameState(draft.gameState, parsedOutput.deltas);
      let finalGameState = this.gameStateManager.updateSceneState(stateAfterDeltas, parsedOutput.scene, parsedOutput.deltas);

      finalGameState.narration = parsedOutput.prose;
      draft.gameState = finalGameState;

      if (playerAction) {
        draft.conversationHistory.push({ role: 'user', content: playerAction });
      }
      draft.conversationHistory.push({ role: 'assistant', content: parsedOutput.prose });
      
      draft.logs.push(logEntry);

      draft.currentTurn += 1;
      draft.updatedAt = new Date().toISOString();
    });
    console.log(`[SnapshotUpdater.ts] applyTurnResultToSnapshot: Finished. New snapshot ID: ${newSnapshot.id}.`);
    return newSnapshot;
  }

  public applyCategoryRename(snapshot: GameSnapshot, oldName: string, newName: string): GameSnapshot {
    console.log(`[SnapshotUpdater.ts] applyCategoryRename: ${oldName} -> ${newName}`);
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
    console.log(`[SnapshotUpdater.ts] applyEntityRename: ${category}.${oldName} -> ${category}.${newName}`);
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
    console.log(`[SnapshotUpdater.ts] applyCategoryDelete: ${category}`);
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
    console.log(`[SnapshotUpdater.ts] applyEntityDelete: ${category}.${entity}`);
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
    console.log(`[SnapshotUpdater.ts] applyKeyValueEdit: ${key} = ${JSON.stringify(value)}`);
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
    console.log(`[SnapshotUpdater.ts] applyKeyDelete: ${key}`);
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
    console.log(`[SnapshotUpdater.ts] applyPinToggle: Starting for snapshot ${snapshot.id}, keyPath: ${keyPath}, type: ${type}.`);
    const newSnapshot = produce(snapshot, draft => {
      const currentWorldState = draft.gameState.worldState || {};
      const currentPinnedKeys = draft.worldStatePinnedKeys || [];
      const newPinnedKeys = new Set(currentPinnedKeys);

      const getAllChildVariableKeys = (basePath: string): string[] => {
        const nestedData = getNestedValue(currentWorldState, basePath.split('.'));
        if (typeof nestedData !== 'object' || nestedData === null) return [];
        const flattened = flattenJsonObject(nestedData, basePath);
        return Object.keys(flattened).filter(key => flattened[key] !== undefined); // Only include existing keys
      };

      let relevantKeysToToggle: string[] = [];
      if (type === 'variable') {
        relevantKeysToToggle = [keyPath];
      } else { // 'entity' or 'category'
        relevantKeysToToggle = getAllChildVariableKeys(keyPath);
      }

      // If there are no keys to toggle (e.g., entity doesn't exist), do nothing.
      if (relevantKeysToToggle.length === 0) {
        console.warn(`[SnapshotUpdater.ts] applyPinToggle: No relevant keys found for ${type} at "${keyPath}". No change.`);
        return; // No changes to draft
      }
      
      const areAllChildrenCurrentlyPinned = relevantKeysToToggle.every(key => newPinnedKeys.has(key));
      const shouldPin = !areAllChildrenCurrentlyPinned; 

      console.log(`[SnapshotUpdater.ts] applyPinToggle: Relevant keys (${relevantKeysToToggle.length}): ${relevantKeysToToggle.join(', ')}. ShouldPin: ${shouldPin}`);

      relevantKeysToToggle.forEach(key => {
        if (shouldPin) {
          newPinnedKeys.add(key);
        } else {
          newPinnedKeys.delete(key);
        }
      });

      draft.worldStatePinnedKeys = Array.from(newPinnedKeys).sort();
      draft.updatedAt = new Date().toISOString();
      console.log(`[SnapshotUpdater.ts] applyPinToggle: Final pinned keys count: ${draft.worldStatePinnedKeys.length}.`);
    });
    console.log(`[SnapshotUpdater.ts] applyPinToggle: Finished. New snapshot ID: ${newSnapshot.id}.`);
    return newSnapshot;
  }
}