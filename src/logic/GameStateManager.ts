// src/logic/GameStateManager.ts

import { GameState, SceneState } from '../models/GameState';
import { DeltaMap } from '../models/DeltaInstruction';
import { IGameStateManager } from './IGameStateManager';
import { produce } from 'immer'; // For immutable updates
import { flattenJsonObject, getNestedValue } from '../utils/jsonUtils';

/**
 * Manages the mutable aspects of the game state (world state and scene).
 * All mutations here are designed to be immutable, returning new state objects.
 */
export class GameStateManager implements IGameStateManager {

  /**
   * Applies delta instructions to the worldState within a given GameState.
   * @param gameState The current game state to modify.
   * @param deltas The map of delta instructions to apply.
   * @returns A new GameState object with deltas applied (immutable update).
   */
  public applyDeltasToGameState(gameState: GameState, deltas: DeltaMap): GameState {
    return produce(gameState, draft => {
      const updatedWorld = draft.worldState; // immer makes this a mutable draft

      for (const fullKey in deltas) {
        const instruction = deltas[fullKey];
        const parts = instruction.key.split('.');

        let currentLevel: Record<string, any> = updatedWorld;
        for (let i = 0; i < parts.length - 1; i++) {
          const part = parts[i];
          if (!currentLevel[part] || typeof currentLevel[part] !== 'object' || Array.isArray(currentLevel[part])) {
            currentLevel[part] = {};
          }
          currentLevel = currentLevel[part];
        }

        const lastPart = parts[parts.length - 1];

        switch (instruction.op) {
          case 'add':
            const prevAddValue = typeof currentLevel[lastPart] === 'number' ? currentLevel[lastPart] : 0;
            const addValue = typeof instruction.value === 'number' ? instruction.value : 0;
            currentLevel[lastPart] = prevAddValue + addValue;
            break;
          case 'assign':
            currentLevel[lastPart] = instruction.value;
            break;
          case 'declare':
            if (!(lastPart in currentLevel)) {
              currentLevel[lastPart] = instruction.value;
            }
            break;
          case 'delete':
            delete currentLevel[lastPart];
            break;
        }
      }
    });
  }

  /**
   * Updates the scene state within a given GameState based on parsed AI output or inferred deltas.
   * @param gameState The current game state to modify.
   * @param parsedScene The parsed scene object from AI output.
   * @param deltas The delta map (for inference if no explicit scene).
   * @returns A new GameState object with updated scene (immutable update).
   */
  public updateSceneState(
    gameState: GameState,
    parsedScene: Record<string, any> | null | undefined,
    deltas: DeltaMap
  ): GameState {
    return produce(gameState, draft => {
      let newLocation: string | null = draft.scene.location;
      let newPresent: string[] = [...draft.scene.present];

      if (parsedScene) {
        if (parsedScene.location !== undefined) {
          newLocation = typeof parsedScene.location === 'string' ? parsedScene.location : null;
        }
        if (Array.isArray(parsedScene.present)) {
          newPresent = parsedScene.present.filter((item: any) => typeof item === 'string');
        }
      } else {
        if ((!newLocation && newPresent.length === 0) && deltas) {
          const inferredPresent = new Set<string>();
          for (const fullKey in deltas) {
            const instruction = deltas[fullKey];
            if (instruction.op === 'declare') {
              const parts = instruction.key.split('.');
              if (parts.length >= 2) {
                const category = parts[0];
                const entity = parts[1];
                const valueObj = instruction.value as Record<string, any>;
                if (valueObj && (valueObj.tag === "character" || valueObj.tag === "location")) {
                  inferredPresent.add(`${category}.${entity}`);
                }
              }
              if (instruction.key === "world.location" && typeof instruction.value === 'string') {
                newLocation = instruction.value;
              }
            }
          }
          newPresent = Array.from(inferredPresent);
        }
      }

      draft.scene.location = newLocation;
      draft.scene.present = newPresent;
    });
  }

  // --- World State Direct Modification Methods (Immutable) ---

  public renameCategory(currentWorldState: Record<string, any>, currentPinnedKeys: string[], oldName: string, newName: string): { updatedWorldState: Record<string, any>; updatedPinnedKeys: string[] } {
    const updatedWorldState = produce(currentWorldState, draft => {
      if (draft[oldName]) {
        draft[newName] = draft[oldName];
        delete draft[oldName];
      }
    });

    const updatedPinnedKeys = currentPinnedKeys.map(key =>
      key.startsWith(oldName + '.') ? `${newName}${key.substring(oldName.length)}` : key
    );
    return { updatedWorldState, updatedPinnedKeys };
  }

  public renameEntity(currentWorldState: Record<string, any>, currentPinnedKeys: string[], category: string, oldName: string, newName: string): { updatedWorldState: Record<string, any>; updatedPinnedKeys: string[] } {
    const updatedWorldState = produce(currentWorldState, draft => {
      const categoryObj = draft[category];
      if (categoryObj && categoryObj[oldName]) {
        categoryObj[newName] = categoryObj[oldName];
        delete categoryObj[oldName];
      }
    });

    const oldEntityPath = `${category}.${oldName}`;
    const newEntityPath = `${category}.${newName}`;
    const updatedPinnedKeys = currentPinnedKeys.map(key =>
      key.startsWith(oldEntityPath + '.') ? `${newEntityPath}${key.substring(oldEntityPath.length)}` : key
    );
    return { updatedWorldState, updatedPinnedKeys };
  }

  public deleteCategory(currentWorldState: Record<string, any>, currentPinnedKeys: string[], category: string): { updatedWorldState: Record<string, any>; updatedPinnedKeys: string[] } {
    const updatedWorldState = produce(currentWorldState, draft => {
      delete draft[category];
    });
    const updatedPinnedKeys = currentPinnedKeys.filter(key => !key.startsWith(category + '.'));
    return { updatedWorldState, updatedPinnedKeys };
  }

  public deleteEntity(currentWorldState: Record<string, any>, currentPinnedKeys: string[], category: string, entity: string): { updatedWorldState: Record<string, any>; updatedPinnedKeys: string[] } {
    const updatedWorldState = produce(currentWorldState, draft => {
      const categoryObj = draft[category];
      if (categoryObj && categoryObj[entity]) {
        delete categoryObj[entity];
      }
    });
    const entityPath = `${category}.${entity}`;
    const updatedPinnedKeys = currentPinnedKeys.filter(key => !key.startsWith(entityPath + '.'));
    return { updatedWorldState, updatedPinnedKeys };
  }

  public editKeyValue(currentWorldState: Record<string, any>, key: string, value: any): Record<string, any> {
    return produce(currentWorldState, draft => {
      const parts = key.split('.');
      let current: any = draft;
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!current[part] || typeof current[part] !== 'object') {
          current[part] = {};
        }
        current = current[part];
      }
      current[parts[parts.length - 1]] = value;
    });
  }

  public deleteKey(currentWorldState: Record<string, any>, currentPinnedKeys: string[], key: string): { updatedWorldState: Record<string, any>; updatedPinnedKeys: string[] } {
    const updatedWorldState = produce(currentWorldState, draft => {
      const parts = key.split('.');
      let current: any = draft;
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!(part in current)) {
          return; // Path doesn't exist, nothing to delete
        }
        current = current[part];
      }
      delete current[parts[parts.length - 1]];
    });
    const updatedPinnedKeys = currentPinnedKeys.filter(pk => pk !== key);
    return { updatedWorldState, updatedPinnedKeys };
  }
}