// src/logic/IGameStateManager.ts

import type { GameState, DeltaMap } from '../models';

/**
 * Defines the contract for managing the mutable state of the game (worldState and scene).
 * This manager operates on GameState objects and does not directly interact with repositories.
 */
export interface IGameStateManager {
  /**
   * Applies delta instructions to the worldState within a given GameState.
   * @param gameState The current game state to modify.
   * @param deltas The map of delta instructions to apply.
   * @returns A new GameState object with deltas applied (immutable update).
   */
  applyDeltasToGameState(gameState: GameState, deltas: DeltaMap): GameState;

  /**
   * Updates the scene state within a given GameState based on parsed AI output or inferred deltas.
   * @param gameState The current game state to modify.
   * @param parsedScene The parsed scene object from AI output.
   * @param deltas The delta map (for inference if no explicit scene).
   * @returns A new GameState object with updated scene (immutable update).
   */
  updateSceneState(gameState: GameState, parsedScene: Record<string, any> | null | undefined, deltas: DeltaMap): GameState;

  // Methods for direct world state modification (now immutable operations)
  renameCategory(currentWorldState: Record<string, any>, currentPinnedKeys: string[], oldName: string, newName: string): { updatedWorldState: Record<string, any>; updatedPinnedKeys: string[] };
  renameEntity(currentWorldState: Record<string, any>, currentPinnedKeys: string[], category: string, oldName: string, newName: string): { updatedWorldState: Record<string, any>; updatedPinnedKeys: string[] };
  deleteCategory(currentWorldState: Record<string, any>, currentPinnedKeys: string[], category: string): { updatedWorldState: Record<string, any>; updatedPinnedKeys: string[] };
  deleteEntity(currentWorldState: Record<string, any>, currentPinnedKeys: string[], category: string, entity: string): { updatedWorldState: Record<string, any>; updatedPinnedKeys: string[] };
  editKeyValue(currentWorldState: Record<string, any>, key: string, value: any): Record<string, any>;
  deleteKey(currentWorldState: Record<string, any>, currentPinnedKeys: string[], key: string): { updatedWorldState: Record<string, any>; updatedPinnedKeys: string[] };
}