// src/models/GameState.ts

/**
 * Represents the current scene's location and present entities.
 * Corresponds to the state managed by SceneManager.
 */
export interface SceneState {
  location: string | null;
  present: string[]; // List of entity keys, e.g., ["player.#you", "npcs.#fox"]
}

/**
 * Defines the core mutable state of the game.
 * All game variables (like HP, gold) are expected to be dynamic and reside within `worldState`.
 */
export interface GameState {
  narration: string;
  worldState: Record<string, any>; // The dynamic game world
  scene: SceneState; // The current scene state
}