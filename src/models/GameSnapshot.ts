// src/models/GameSnapshot.ts

import type { GameState, LogEntry, Message } from './index';

/**
 * Represents a full, self-contained snapshot of a game session.
 * This is the primary object for saving and loading games.
 * Based on `StoryForgeViewModel.buildSnapshot()`.
 */
export interface GameSnapshot {
  // --- Core Identifiers ---
  id: string; // Unique ID for this snapshot/game session
  gameId: string; 
  userId: string;
  promptCardId: string; // ID of the card used
  title: string; // NEW: A human-readable title for the saved game

  // --- Timestamps ---
  createdAt: string; // When the game session was started
  updatedAt: string; // When this snapshot was last saved

  // --- Core Game State ---
  currentTurn: number;
  gameState: GameState; // Contains worldState, scene, narration
  conversationHistory: Message[]; // Full user/assistant conversation history

  // --- Logs for Context & Debugging ---
  // Note: All "digests" are now just part of the logs.
  // We extract them for context building, but don't store them separately.
  logs: LogEntry[];

  // --- UI Preferences (Persisted with Snapshot) ---
  worldStatePinnedKeys: string[]; // Stores full variable paths, e.g., "npcs.#fox.hp"
}