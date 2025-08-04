// src/state/useGameStateStore.ts

import { create } from 'zustand';
import { GameSnapshot, GameState, LogEntry, Message } from '../models/index';
// REMOVED: import { gameSession } from '../logic/gameSession'; // REMOVE this import
import { flattenJsonObject, getNestedValue } from '../utils/jsonUtils';
import { produce } from 'immer'; // For immutable updates of nested objects
import { useSettingsStore } from './useSettingsStore'; // Import the new settings store
import { useCallback } from 'react'; // Import useCallback

// Access the globally available gameSessionInstance.
// This is now accessed directly within actions to ensure it's always live.
// const gameSession = typeof window !== 'undefined' ? window.gameSessionInstance : null; // REMOVED

// Define types for pinning
type PinToggleType = 'variable' | 'entity' | 'category';

interface GameStateStore {
  currentSnapshot: GameSnapshot | null;
  currentPromptCardId: string | null;
  currentGameState: GameState | null;
  gameLogs: LogEntry[];
  conversationHistory: Message[];
  worldStatePinnedKeys: string[]; // Stores full variable paths, e.g., "npcs.#fox.hp"
  narratorInputText: string;
  narratorScrollPosition: number;
  gameError: string | null;
  gameLoading: boolean;

  // Actions
  initializeGame: (userId: string, cardId: string, existingSnapshotId?: string) => Promise<void>;
  processPlayerAction: (action: string) => Promise<void>;
  saveGame: () => Promise<void>;
  loadGame: (snapshotId: string) => Promise<void>;

  // Pinning actions
  toggleWorldStatePin: (keyPath: string, type: PinToggleType) => void;
  unpinAllForEntity: (entityPath: string) => void; // e.g., "npcs.#fox"
  unpinIndividualVariable: (variablePath: string) => void; // e.g., "npcs.#fox.hp"

  // UI related state updates
  updateNarratorInputText: (text: string) => void;
  updateNarratorScrollPosition: (position: number) => void;

  // World state editing actions (will be implemented via logic layer eventually)
  renameWorldCategory: (oldName: string, newName: string) => Promise<void>;
  renameWorldEntity: (category: string, oldName: string, newName: string) => Promise<void>;
  deleteWorldCategory: (category: string) => Promise<void>;
  deleteWorldEntity: (category: string, entity: string) => Promise<void>;
  editWorldKeyValue: (key: string, value: any) => Promise<void>;
  deleteWorldKey: (key: string) => Promise<void>;
}

export const useGameStateStore = create<GameStateStore>((set, get) => ({
  currentSnapshot: null,
  currentPromptCardId: null,
  currentGameState: null,
  gameLogs: [],
  conversationHistory: [],
  worldStatePinnedKeys: [],
  narratorInputText: '',
  narratorScrollPosition: 0,
  gameError: null,
  gameLoading: false,

  initializeGame: async (userId, cardId, existingSnapshotId) => {
    console.log('GameStateStore: initializeGame action started.');
    set({ gameLoading: true, gameError: null });
    try {
      // Access gameSessionInstance directly here to ensure latest reference
      const gameSessionInstance = window.gameSessionInstance;
      if (!gameSessionInstance) {
          throw new Error("Game session instance not found on window. Ensure main.tsx has initialized it.");
      }

      console.log('GameStateStore: Calling gameSession.initializeGame...');
      await gameSessionInstance.initializeGame(userId, cardId, existingSnapshotId);
      console.log('GameStateStore: gameSession.initializeGame completed.');

      console.log('GameStateStore: DIRECT INSPECTION of gameSession instance:', gameSessionInstance);

      const snapshot = gameSessionInstance.getCurrentGameSnapshot();
      console.log('GameStateStore: Retrieved snapshot from gameSession:', snapshot);

      if (snapshot) {
        set({
          currentSnapshot: snapshot,
          currentPromptCardId: snapshot.promptCardId, // Use snapshot's ID for consistency
          currentGameState: snapshot.gameState,
          gameLogs: snapshot.logs || [],
          conversationHistory: snapshot.conversationHistory || [],
          worldStatePinnedKeys: snapshot.worldStatePinnedKeys || [],
        });
        console.log('GameStateStore: Zustand state updated with snapshot. currentSnapshot:', get().currentSnapshot);
      } else {
        console.warn('GameStateStore: gameSession.getCurrentGameSnapshot() returned null after initialization. Setting error.');
        set({ gameError: "Game state could not be loaded or initialized.", gameLoading: false });
      }
      set({ gameLoading: false });
    } catch (error: any) {
      console.error("GameStateStore: Error in initializeGame action:", error);
      set({ gameError: error.message, gameLoading: false });
    }
  },

  processPlayerAction: async (action) => {
    const gameSessionInstance = window.gameSessionInstance;
    if (!gameSessionInstance) {
        set({ gameError: "Game session not initialized.", gameLoading: false });
        return;
    }
    set({ gameLoading: true, gameError: null });

    // Get the dummy narrator state from useSettingsStore
    const useDummyNarrator = useSettingsStore.getState().useDummyNarrator;

    try {
      // Pass the dummy narrator flag to gameSession
      const { aiProse, newLogEntries, updatedSnapshot } = await gameSessionInstance.processPlayerAction(
        action,
        useDummyNarrator // Pass the flag
      );
      set({
        currentSnapshot: updatedSnapshot,
        currentGameState: updatedSnapshot.gameState,
        gameLogs: updatedSnapshot.logs,
        conversationHistory: updatedSnapshot.conversationHistory,
        narratorInputText: '',
        worldStatePinnedKeys: updatedSnapshot.worldStatePinnedKeys || [], // Update pinned keys
      });
      set({ gameLoading: false });
    } catch (error: any) {
      set({ gameError: error.message, gameLoading: false });
      console.error("Error processing player action:", error);
    }
  },

  saveGame: async () => {
    const gameSessionInstance = window.gameSessionInstance;
    if (!gameSessionInstance) {
        console.warn("Cannot save game: game session not initialized.");
        return;
    }
    const currentSnapshot = get().currentSnapshot;
    if (currentSnapshot) {
        // Before saving, ensure the gameSession's internal snapshot reflects the current pinned keys from Zustand.
        // This is important because `toggleWorldStatePin` directly updates the store's `currentSnapshot` object,
        // but `gameSession` might not immediately reflect that change in its *own* internal `currentSnapshot`.
        // A direct way to do this is to ensure `gameSession.currentSnapshot` is explicitly updated.
        // For now, `processPlayerAction` already sets `gameSession.currentSnapshot = updatedSnapshot`,
        // and `toggleWorldStatePin` also updates the `currentSnapshot` within the Zustand store.
        // So, when `saveGame` is called, `gameSession.getCurrentGameSnapshot()` will return the
        // Zustand-updated snapshot (if the reference is the same, which it is if Immer is used to update the whole object).
        // To be explicit, we could pass the currentSnapshot:
        // await gameSession.saveGame(currentSnapshot); // (Requires modifying IGameSession.saveGame)
        // For now, relying on the fact that `currentSnapshot` in GameSession points to the same object as in store after updates.
        await gameSessionInstance.saveGame();
    } else {
        console.warn("No current snapshot to save.");
    }
  },
  loadGame: async (snapshotId) => {
    const gameSessionInstance = window.gameSessionInstance;
    if (!gameSessionInstance || !get().currentUserId) {
        set({ gameError: "Game session not initialized or user not logged in.", gameLoading: false });
        return;
    }
    set({ gameLoading: true, gameError: null });
    try {
      await gameSessionInstance.loadGame(snapshotId);
      const snapshot = gameSessionInstance.getCurrentGameSnapshot();
      if (snapshot) {
        set({
          currentSnapshot: snapshot,
          currentPromptCardId: snapshot.promptCardId,
          currentGameState: snapshot.gameState,
          gameLogs: snapshot.logs || [],
          conversationHistory: snapshot.conversationHistory || [],
          worldStatePinnedKeys: snapshot.worldStatePinnedKeys || [], // Load pinned keys
        });
      }
      set({ gameLoading: false });
    } catch (error: any) {
      set({ gameError: error.message, gameLoading: false });
      console.error("Error loading game:", error);
    }
  },

  toggleWorldStatePin: (keyPath: string, type: PinToggleType) => {
    set(produce((state: GameStateStore) => { // Use immer's produce for immutable updates
      const currentWorldState = state.currentGameState?.worldState || {};
      const newPinnedKeys = new Set(state.worldStatePinnedKeys);

      const isCurrentlyPinned = (path: string) => newPinnedKeys.has(path);

      let relevantKeysToToggle: string[] = [];

      if (type === 'variable') {
        relevantKeysToToggle = [keyPath];
      } else if (type === 'entity') {
        const flattenedEntity = flattenJsonObject(getNestedValue(currentWorldState, keyPath.split('.')), keyPath);
        relevantKeysToToggle = Object.keys(flattenedEntity).filter(k => {
          return k.startsWith(keyPath + '.') && k.split('.').length > keyPath.split('.').length;
        });
      } else if (type === 'category') {
        const flattenedCategory = flattenJsonObject(getNestedValue(currentWorldState, keyPath.split('.')), keyPath);
        relevantKeysToToggle = Object.keys(flattenedCategory).filter(k => {
          return k.startsWith(keyPath + '.') && k.split('.').length > keyPath.split('.').length;
        });
      }

      const shouldPin = relevantKeysToToggle.length > 0
        ? !isCurrentlyPinned(relevantKeysToToggle[0])
        : true; // If no keys found, default to pinning (e.g., new category/entity)

      relevantKeysToToggle.forEach(key => {
        if (shouldPin) {
          newPinnedKeys.add(key);
        } else {
          newPinnedKeys.delete(key);
        }
      });

      state.worldStatePinnedKeys = Array.from(newPinnedKeys);
      if (state.currentSnapshot) {
        state.currentSnapshot.worldStatePinnedKeys = state.worldStatePinnedKeys;
      }
    }));
    get().saveGame(); // Trigger a save after pinning state changes
  },

  unpinAllForEntity: (entityPath: string) => {
    set(produce((state: GameStateStore) => {
      const newPinnedKeys = new Set(state.worldStatePinnedKeys);
      state.worldStatePinnedKeys.forEach(key => {
        if (key.startsWith(entityPath + '.')) {
          newPinnedKeys.delete(key);
        }
      });
      state.worldStatePinnedKeys = Array.from(newPinnedKeys);
      if (state.currentSnapshot) {
        state.currentSnapshot.worldStatePinnedKeys = state.worldStatePinnedKeys;
      }
    }));
    get().saveGame();
  },

  unpinIndividualVariable: (variablePath: string) => {
    set(produce((state: GameStateStore) => {
      state.worldStatePinnedKeys = state.worldStatePinnedKeys.filter(key => key !== variablePath);
      if (state.currentSnapshot) {
        state.currentSnapshot.worldStatePinnedKeys = state.worldStatePinnedKeys;
      }
    }));
    get().saveGame();
  },

  updateNarratorInputText: (text) => set({ narratorInputText: text }),
  updateNarratorScrollPosition: (position) => set({ narratorScrollPosition: position }),

  renameWorldCategory: async (oldName, newName) => {
    set(produce((state: GameStateStore) => {
      if (!state.currentGameState) return;
      const newWorldState = state.currentGameState.worldState; // immer makes this mutable draft
      if (newWorldState[oldName]) {
        newWorldState[newName] = newWorldState[oldName];
        delete newWorldState[oldName];
        state.currentGameState.worldState = newWorldState; // Assign back the draft

        // Update pinned keys
        state.worldStatePinnedKeys = state.worldStatePinnedKeys.map(key =>
            key.startsWith(oldName + '.') ? `${newName}${key.substring(oldName.length)}` : key
        );
        if (state.currentSnapshot) {
            state.currentSnapshot.gameState.worldState = newWorldState;
            state.currentSnapshot.worldStatePinnedKeys = state.worldStatePinnedKeys;
        }
      }
    }));
    get().saveGame();
  },
  renameWorldEntity: async (category, oldName, newName) => {
    set(produce((state: GameStateStore) => {
      if (!state.currentGameState || !state.currentGameState.worldState[category]) return;
      const categoryObj = state.currentGameState.worldState[category]; // mutable draft
      if (categoryObj[oldName]) {
        categoryObj[newName] = categoryObj[oldName];
        delete categoryObj[oldName];
        state.currentGameState.worldState[category] = categoryObj;

        // Update pinned keys
        const oldEntityPath = `${category}.${oldName}`;
        const newEntityPath = `${category}.${newName}`;
        state.worldStatePinnedKeys = state.worldStatePinnedKeys.map(key =>
            key.startsWith(oldEntityPath + '.') ? `${newEntityPath}${key.substring(oldEntityPath.length)}` : key
        );
        if (state.currentSnapshot) {
            state.currentSnapshot.gameState.worldState = state.currentGameState.worldState;
            state.currentSnapshot.worldStatePinnedKeys = state.worldStatePinnedKeys;
        }
      }
    }));
    get().saveGame();
  },
  deleteWorldCategory: async (category) => {
    set(produce((state: GameStateStore) => {
      if (!state.currentGameState || !state.currentGameState.worldState[category]) return;
      const newWorldState = state.currentGameState.worldState; // mutable draft
      delete newWorldState[category];
      state.currentGameState.worldState = newWorldState;

      // Remove relevant pinned keys
      state.worldStatePinnedKeys = state.worldStatePinnedKeys.filter(key => !key.startsWith(category + '.'));
      if (state.currentSnapshot) {
          state.currentSnapshot.gameState.worldState = newWorldState;
          state.currentSnapshot.worldStatePinnedKeys = state.worldStatePinnedKeys;
        }
    }));
    get().saveGame();
  },
  deleteWorldEntity: async (category, entity) => {
    set(produce((state: GameStateStore) => {
      if (!state.currentGameState || !state.currentGameState.worldState[category] || !state.currentGameState.worldState[category][entity]) return;
      const categoryObj = state.currentGameState.worldState[category]; // mutable draft
      delete categoryObj[entity];
      state.currentGameState.worldState[category] = categoryObj;

      // Remove relevant pinned keys
      const entityPath = `${category}.${entity}`;
      state.worldStatePinnedKeys = state.worldStatePinnedKeys.filter(key => !key.startsWith(entityPath + '.'));
      if (state.currentSnapshot) {
          state.currentSnapshot.gameState.worldState = state.currentGameState.worldState;
          state.currentSnapshot.worldStatePinnedKeys = state.worldStatePinnedKeys;
      }
    }));
    get().saveGame();
  },
  editWorldKeyValue: async (key, value) => {
    set(produce((state: GameStateStore) => {
      if (!state.currentGameState) return;
      const newWorldState = state.currentGameState.worldState; // mutable draft
      const parts = key.split('.');
      let current: any = newWorldState;
      for (let i = 0; i < parts.length - 1; i++) {
          const part = parts[i];
          if (!(part in current)) {
              current[part] = {};
          }
          current = current[part];
      }
      current[parts[parts.length - 1]] = value;
      state.currentGameState.worldState = newWorldState; // Assign back the draft
      if (state.currentSnapshot) {
          state.currentSnapshot.gameState.worldState = newWorldState;
      }
    }));
    get().saveGame();
  },
  deleteWorldKey: async (key) => {
    set(produce((state: GameStateStore) => {
      if (!state.currentGameState) return;
      const newWorldState = state.currentGameState.worldState; // mutable draft
      const parts = key.split('.');
      let current: any = newWorldState;
      for (let i = 0; i < parts.length - 1; i++) {
          const part = parts[i];
          if (!(part in current)) {
              return; // Path doesn't exist, nothing to delete
          }
          current = current[part];
      }
      delete current[parts[parts.length - 1]];
      state.currentGameState.worldState = newWorldState;

      // Remove from pinned keys
      state.worldStatePinnedKeys = state.worldStatePinnedKeys.filter(pk => pk !== key);
      if (state.currentSnapshot) {
          state.currentSnapshot.gameState.worldState = newWorldState;
          state.currentSnapshot.worldStatePinnedKeys = state.worldStatePinnedKeys;
      }
    }));
    get().saveGame();
  },
}));