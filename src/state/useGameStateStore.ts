// src/state/useGameStateStore.ts

import { create } from 'zustand';
import { GameSnapshot, GameState, LogEntry, Message } from '../models/index';
import { flattenJsonObject, getNestedValue } from '../utils/jsonUtils';
import { produce } from 'immer'; // For immutable updates of nested objects
import { useSettingsStore } from './useSettingsStore'; // Import the new settings store
import { useCallback } from 'react'; // Import useCallback

import { IGameSession } from '../logic/gameSession'; // Import the IGameSession interface for type safety

// Module-level variable to hold the injected GameSession instance
let _gameSessionInstance: IGameSession;

/**
 * Initializes the GameStateStore with the GameSession instance.
 * This function should be called once, typically from a provider component (e.g., GameSessionAndStoreProvider).
 * It ensures that the Zustand store's actions can access the game session.
 */
export const initializeGameStateStore = (gameSession: IGameSession) => {
  if (!_gameSessionInstance) {
    _gameSessionInstance = gameSession;
    console.log("GameStateStore: GameSession instance injected.");
  } else {
    console.warn("GameStateStore: Attempted to re-initialize GameSession instance. This should only happen once.");
  }
};

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

  // Actions - these no longer accept gameSession as a parameter.
  // They will internally use the _gameSessionInstance module variable.
  initializeGame: (userId: string, cardId: string, existingSnapshotId?: string) => Promise<void>;
  processPlayerAction: (action: string) => Promise<void>;
  processFirstNarratorTurn: () => Promise<void>;
  saveGame: () => Promise<void>;
  loadGame: (userId: string, snapshotId: string) => Promise<void>;
  loadLastActiveGame: (userId: string) => Promise<boolean>;

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

    // Ensure gameSession instance has been injected
    if (!_gameSessionInstance) {
      set({ gameError: "Game session instance not initialized.", gameLoading: false });
      console.error("GameSession instance not found in useGameStateStore. Call initializeGameStateStore first.");
      return;
    }

    const useDummyNarrator = useSettingsStore.getState().useDummyNarrator;

    try {
      console.log('GameStateStore: Calling _gameSessionInstance.initializeGame...');
      // Use the injected _gameSessionInstance
      await _gameSessionInstance.initializeGame(userId, cardId, existingSnapshotId, useDummyNarrator);

      console.log('GameStateStore: _gameSessionInstance.initializeGame completed.');

      // Retrieve state from the injected _gameSessionInstance
      const snapshot = _gameSessionInstance.getCurrentGameSnapshot();
      console.log('GameStateStore: Retrieved snapshot from _gameSessionInstance:', snapshot);
      if (snapshot) {
        set({
          currentSnapshot: snapshot,
          currentPromptCardId: snapshot.promptCardId,
          currentGameState: snapshot.gameState,
          gameLogs: snapshot.logs || [],
          conversationHistory: snapshot.conversationHistory || [],
          worldStatePinnedKeys: snapshot.worldStatePinnedKeys || [],
        });
        console.log('GameStateStore: Zustand state updated with snapshot. currentSnapshot:', get().currentSnapshot);
      } else {
        console.warn('GameStateStore: _gameSessionInstance.getCurrentGameSnapshot() returned null after initialization. Setting error.');
        set({ gameError: "Game state could not be loaded or initialized.", gameLoading: false });
      }
      set({ gameLoading: false });
    } catch (error: any) {
      console.error("GameStateStore: Error in initializeGame action:", error);
      set({ gameError: error.message, gameLoading: false });
    }
  },

  processFirstNarratorTurn: async () => {
    // Ensure gameSession instance has been injected
    if (!_gameSessionInstance) {
      set({ gameError: "Game session instance not initialized.", gameLoading: false });
      return;
    }
    set({ gameLoading: true, gameError: null });

    const useDummyNarrator = useSettingsStore.getState().useDummyNarrator;

    try {
      // Use the injected _gameSessionInstance
      await _gameSessionInstance.processFirstTurn(useDummyNarrator);

      // Retrieve state from the injected _gameSessionInstance
      const updatedSnapshot = _gameSessionInstance.getCurrentGameSnapshot();
      if (updatedSnapshot) {
        set({
          currentSnapshot: updatedSnapshot,
          currentGameState: updatedSnapshot.gameState,
          gameLogs: updatedSnapshot.logs,
          conversationHistory: updatedSnapshot.conversationHistory,
        });
      }
      set({ gameLoading: false });
    } catch (error: any) {
      set({ gameError: error.message, gameLoading: false });
      console.error("Error processing first narrator turn:", error);
    }
  },

  processPlayerAction: async (action) => {
    // Ensure gameSession instance has been injected
    if (!_gameSessionInstance) {
        set({ gameError: "Game session instance not initialized.", gameLoading: false });
        return;
    }
    set({ gameLoading: true, gameError: null });

    const useDummyNarrator = useSettingsStore.getState().useDummyNarrator;

    try {
      // Use the injected _gameSessionInstance
      const { aiProse, newLogEntries, updatedSnapshot } = await _gameSessionInstance.processPlayerAction(
        action,
        useDummyNarrator
      );
      set({
        currentSnapshot: updatedSnapshot,
        currentGameState: updatedSnapshot.gameState,
        gameLogs: updatedSnapshot.logs,
        conversationHistory: updatedSnapshot.conversationHistory,
        narratorInputText: '',
        worldStatePinnedKeys: updatedSnapshot.worldStatePinnedKeys || [],
      });
      set({ gameLoading: false });
    } catch (error: any) {
      set({ gameError: error.message, gameLoading: false });
      console.error("Error processing player action:", error);
    }
  },

  saveGame: async () => {
    // Ensure gameSession instance has been injected
    if (!_gameSessionInstance) {
        console.error("GameSession: Cannot save game because gameSessionInstance is not set in store.");
        throw new Error("Game session not initialized in store.");
    }
    const currentSnapshot = get().currentSnapshot;
    if (currentSnapshot) {
      const snapshotToSave = produce(currentSnapshot, draft => {
        draft.worldStatePinnedKeys = get().worldStatePinnedKeys;
        draft.updatedAt = new Date().toISOString();
      });

      await _gameSessionInstance.saveGame(snapshotToSave);
      console.log('useGameStateStore: saveGame() finished.');
    } else {
      console.warn("No current snapshot in store to save.");
    }
  },

  loadGame: async (userId, snapshotId) => {
    // Ensure gameSession instance has been injected
    if (!_gameSessionInstance) {
        set({ gameError: "Game session instance not initialized.", gameLoading: false });
        return;
    }
    set({ gameLoading: true, gameError: null });
    try {
      // Use the injected _gameSessionInstance
      await _gameSessionInstance.loadGame(userId, snapshotId);
      // Retrieve state from the injected _gameSessionInstance
      const snapshot = _gameSessionInstance.getCurrentGameSnapshot();
      if (snapshot) {
        set({
          currentSnapshot: snapshot,
          currentPromptCardId: snapshot.promptCardId,
          currentGameState: snapshot.gameState,
          gameLogs: snapshot.logs || [],
          conversationHistory: snapshot.conversationHistory || [],
          worldStatePinnedKeys: snapshot.worldStatePinnedKeys || [],
        });
      }
      set({ gameLoading: false });
    } catch (error: any) {
      set({ gameError: error.message, gameLoading: false });
      console.error("Error loading game:", error);
    }
  },

  loadLastActiveGame: async (userId: string): Promise<boolean> => {
    set({ gameLoading: true, gameError: null });
    try {
        if (!_gameSessionInstance) {
            throw new Error("Game session instance not found in store.");
        }

        // Access gameRepo via the injected _gameSessionInstance (now public on IGameSession)
        const allSnapshots = await _gameSessionInstance.gameRepo.getAllGameSnapshots(userId);
        if (allSnapshots.length > 0) {
            const lastActiveSnapshot = allSnapshots[0];
            console.log(`GameStateStore: Found last active game: ${lastActiveSnapshot.id}. Loading...`);
            // Use the injected _gameSessionInstance
            await _gameSessionInstance.loadGame(userId, lastActiveSnapshot.id);
            // Retrieve state from the injected _gameSessionInstance
            const loadedSnapshot = _gameSessionInstance.getCurrentGameSnapshot();
            if (loadedSnapshot) {
                set({
                    currentSnapshot: loadedSnapshot,
                    currentPromptCardId: loadedSnapshot.promptCardId,
                    currentGameState: loadedSnapshot.gameState,
                    gameLogs: loadedSnapshot.logs || [],
                    conversationHistory: loadedSnapshot.conversationHistory || [],
                    worldStatePinnedKeys: loadedSnapshot.worldStatePinnedKeys || [],
                });
                console.log(`GameStateStore: Successfully loaded last active game: ${loadedSnapshot.id}`);
                set({ gameLoading: false });
                return true;
            }
        }
        console.log("GameStateStore: No last active game found for user.");
        set({ gameLoading: false, currentSnapshot: null, currentPromptCardId: null, currentGameState: null, gameLogs: [], conversationHistory: [], worldStatePinnedKeys: [] });
        return false;
    } catch (error: any) {
        console.error("GameStateStore: Error loading last active game:", error);
        set({ gameError: error.message, gameLoading: false });
        return false;
    }
  },
  
  toggleWorldStatePin: (keyPath: string, type: PinToggleType) => {
    console.log(`[Store: toggleWorldStatePin] Toggling pin for "${keyPath}" of type "${type}"`);
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
          return k.startsWith(keyPath) && k.split('.').length > keyPath.split('.').length;
        });
      } else if (type === 'category') {
        const flattenedCategory = flattenJsonObject(getNestedValue(currentWorldState, keyPath.split('.')), keyPath);
        relevantKeysToToggle = Object.keys(flattenedCategory).filter(k => {
          return k.startsWith(keyPath) && k.split('.').length > keyPath.split('.').length;
        });
      }

      // Determine if we should pin or unpin. If any of the relevant keys are pinned, we unpin all. Otherwise, we pin.
      // Fixed logic for shouldPin: if ALL are currently pinned, we should UNPIN. Otherwise, we PIN.
      const shouldPin = relevantKeysToToggle.length > 0
        ? !relevantKeysToToggle.every(isCurrentlyPinned)
        : true; // If no keys found, default to pinning (e.g., new category/entity)

      console.log(`[Store: toggleWorldStatePin] Relevant keys:`, relevantKeysToToggle);
      console.log(`[Store: toggleWorldStatePin] Current pinned keys before toggle:`, Array.from(newPinnedKeys));
      console.log(`[Store: toggleWorldStatePin] Should pin:`, shouldPin);


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
      console.log(`[Store: toggleWorldStatePin] Pinned keys after toggle:`, state.worldStatePinnedKeys);
    }));
    get().saveGame(); // Trigger a save after pinning state changes
  },

  unpinAllForEntity: (entityPath: string) => {
    console.log(`%c[Store: unpinAllForEntity] Executing for entity: "${entityPath}"`, 'color: orange;');
    set(produce((state: GameStateStore) => {
      console.log(`%c[Store: unpinAllForEntity] worldStatePinnedKeys before: %o`, 'color: orange;', state.worldStatePinnedKeys);
      // Use Set for efficient deletion
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
      console.log(`%c[Store: unpinAllForEntity] worldStatePinnedKeys after: %o`, 'color: orange;', state.worldStatePinnedKeys);
    }));
    get().saveGame();
  },

  unpinIndividualVariable: (variablePath: string) => {
    console.log(`%c[Store: unpinIndividualVariable] Executing for variable: "${variablePath}"`, 'color: lightblue;');
    set(produce((state: GameStateStore) => {
      console.log(`%c[Store: unpinIndividualVariable] worldStatePinnedKeys before: %o`, 'color: lightblue;', state.worldStatePinnedKeys);
      // This line is the critical one for unpinning a single variable
      state.worldStatePinnedKeys = state.worldStatePinnedKeys.filter(key => key !== variablePath);
      if (state.currentSnapshot) {
        state.currentSnapshot.worldStatePinnedKeys = state.worldStatePinnedKeys;
      }
      console.log(`%c[Store: unpinIndividualVariable] worldStatePinnedKeys after: %o`, 'color: lightblue;', state.worldStatePinnedKeys);
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