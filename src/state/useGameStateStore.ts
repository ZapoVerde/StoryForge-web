// src/state/useGameStateStore.ts

import { create } from 'zustand';
import { GameSnapshot, GameState, LogEntry, Message } from '../models/index';
import { flattenJsonObject, getNestedValue } from '../utils/jsonUtils';
import { produce } from 'immer';
import { useSettingsStore } from './useSettingsStore';

import { IGameSession } from '../logic/gameSession';

// Module-level variable to hold the injected GameSession instance
// Initialized to null, as it will be set later by initializeGameStateStore
let _gameSessionInstance: IGameSession | null = null;

/**
 * Initializes the GameStateStore with the GameSession instance.
 * This function should be called once, typically from a provider component (e.g., GameSessionAndStoreProvider).
 * It ensures that the Zustand store's actions can access the game session.
 */
export const initializeGameStateStore = (gameSession: IGameSession) => {
  if (_gameSessionInstance === null) {
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
  worldStatePinnedKeys: string[];
  narratorInputText: string;
  narratorScrollPosition: number;
  gameError: string | null;
  gameLoading: boolean;

  initializeGame: (userId: string, cardId: string, existingSnapshotId?: string) => Promise<void>;
  processPlayerAction: (action: string) => Promise<void>;
  processFirstNarratorTurn: () => Promise<void>;
  saveGame: () => Promise<void>;
  loadGame: (userId: string, snapshotId: string) => Promise<void>;
  loadLastActiveGame: (userId: string) => Promise<boolean>;

  toggleWorldStatePin: (keyPath: string, type: PinToggleType) => void;
  unpinAllForEntity: (entityPath: string) => void;
  unpinIndividualVariable: (variablePath: string) => void;

  updateNarratorInputText: (text: string) => void;
  updateNarratorScrollPosition: (position: number) => void;

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

  // Helper function to safely get the gameSession instance
  // This ensures we always get the *current* value of _gameSessionInstance
  // and centralizes the error handling for a missing instance.
  _getGameSession: (): IGameSession => {
    if (!_gameSessionInstance) {
      const errorMsg = "Game session instance not initialized. This is a critical error. Ensure GameSessionAndStoreProvider is rendering and initializeGameStateStore has been called.";
      console.error(errorMsg);
      // It's crucial to throw here to prevent further execution with a null instance
      throw new Error(errorMsg);
    }
    return _gameSessionInstance;
  },

  initializeGame: async (userId, cardId, existingSnapshotId) => {
    set({ gameLoading: true, gameError: null });
    try {
      const gameSession = get()._getGameSession(); // Get instance via helper
      await gameSession.initializeGame(userId, cardId, existingSnapshotId);
      const snapshot = gameSession.getCurrentGameSnapshot();
      if (snapshot) {
        set({
          currentSnapshot: snapshot,
          currentPromptCardId: snapshot.promptCardId,
          currentGameState: snapshot.gameState,
          gameLogs: snapshot.logs || [],
          conversationHistory: snapshot.conversationHistory || [],
          worldStatePinnedKeys: snapshot.worldStatePinnedKeys || [],
        });
      } else {
        set({ gameError: "Game state could not be loaded or initialized." });
      }
      set({ gameLoading: false });
    } catch (error: any) {
      set({ gameError: error.message, gameLoading: false });
      console.error("Error in initializeGame action:", error);
    }
  },

  processFirstNarratorTurn: async () => {
    set({ gameLoading: true, gameError: null });
    const useDummyNarrator = useSettingsStore.getState().useDummyNarrator;
    try {
      const gameSession = get()._getGameSession(); // Get instance via helper
      const updatedSnapshot = await gameSession.processFirstNarratorTurn(useDummyNarrator);
      set({
        currentSnapshot: updatedSnapshot,
        currentGameState: updatedSnapshot.gameState,
        gameLogs: updatedSnapshot.logs,
        conversationHistory: updatedSnapshot.conversationHistory,
      });
      set({ gameLoading: false });
    } catch (error: any) {
      set({ gameError: error.message, gameLoading: false });
      console.error("Error processing first narrator turn:", error);
    }
  },

  processPlayerAction: async (action) => {
    set({ gameLoading: true, gameError: null });
    const useDummyNarrator = useSettingsStore.getState().useDummyNarrator;
    try {
      const gameSession = get()._getGameSession(); // Get instance via helper
      const updatedSnapshot = await gameSession.processPlayerAction(action, useDummyNarrator);
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
    try {
      const gameSession = get()._getGameSession(); // Get instance via helper
      const currentSnapshot = get().currentSnapshot;
      if (currentSnapshot) {
        const snapshotToSave = produce(currentSnapshot, draft => {
          draft.worldStatePinnedKeys = get().worldStatePinnedKeys;
          draft.updatedAt = new Date().toISOString();
        });
        await gameSession.saveGame(snapshotToSave);
        console.log('useGameStateStore: saveGame() finished.');
      } else {
        console.warn("No current snapshot in store to save.");
      }
    } catch (error: any) {
        console.error("GameStateStore: Error saving game:", error);
        set({ gameError: error.message }); // Set error in store if save fails
    }
  },

  loadGame: async (userId, snapshotId) => {
    set({ gameLoading: true, gameError: null });
    try {
      const gameSession = get()._getGameSession(); // Get instance via helper
      await gameSession.loadGame(userId, snapshotId);
      const snapshot = gameSession.getCurrentGameSnapshot();
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
      const gameSession = get()._getGameSession(); // Get instance via helper
      const gameLoaded = await gameSession.loadLastActiveGame(userId);
      const loadedSnapshot = gameSession.getCurrentGameSnapshot();

      if (gameLoaded && loadedSnapshot) {
        set({
          currentSnapshot: loadedSnapshot,
          currentPromptCardId: loadedSnapshot.promptCardId,
          currentGameState: loadedSnapshot.gameState,
          gameLogs: loadedSnapshot.logs || [],
          conversationHistory: loadedSnapshot.conversationHistory || [],
          worldStatePinnedKeys: loadedSnapshot.worldStatePinnedKeys || [],
        });
        set({ gameLoading: false });
        return true;
      } else {
        set({ gameLoading: false, currentSnapshot: null, currentPromptCardId: null, currentGameState: null, gameLogs: [], conversationHistory: [], worldStatePinnedKeys: [] });
        return false;
      }
    } catch (error: any) {
      console.error("GameStateStore: Error loading last active game:", error);
      set({ gameError: error.message, gameLoading: false });
      return false;
    }
  },

  toggleWorldStatePin: (keyPath: string, type: PinToggleType) => {
    // This action directly manipulates `worldStatePinnedKeys` state,
    // it doesn't need to call GameSession for core game logic
    // but then calls saveGame, which uses gameSession.
    set(produce((state: GameStateStore) => {
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

      const shouldPin = relevantKeysToToggle.length > 0
        ? !relevantKeysToToggle.every(isCurrentlyPinned)
        : true;

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
    get().saveGame();
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

  // Delegated World State modification actions
  renameWorldCategory: async (oldName, newName) => {
    try {
      const gameSession = get()._getGameSession(); // Get instance via helper
      const updatedSnapshot = await gameSession.renameWorldCategory(oldName, newName);
      if (updatedSnapshot) {
        set({ currentSnapshot: updatedSnapshot, currentGameState: updatedSnapshot.gameState, worldStatePinnedKeys: updatedSnapshot.worldStatePinnedKeys });
      }
    } catch (error: any) {
        console.error("GameStateStore: Error renaming category:", error);
        set({ gameError: error.message });
    }
  },
  renameWorldEntity: async (category, oldName, newName) => {
    try {
        const gameSession = get()._getGameSession();
        const updatedSnapshot = await gameSession.renameWorldEntity(category, oldName, newName);
        if (updatedSnapshot) {
            set({ currentSnapshot: updatedSnapshot, currentGameState: updatedSnapshot.gameState, worldStatePinnedKeys: updatedSnapshot.worldStatePinnedKeys });
        }
    } catch (error: any) {
        console.error("GameStateStore: Error renaming entity:", error);
        set({ gameError: error.message });
    }
  },
  deleteWorldCategory: async (category) => {
    try {
        const gameSession = get()._getGameSession();
        const updatedSnapshot = await gameSession.deleteWorldCategory(category);
        if (updatedSnapshot) {
            set({ currentSnapshot: updatedSnapshot, currentGameState: updatedSnapshot.gameState, worldStatePinnedKeys: updatedSnapshot.worldStatePinnedKeys });
        }
    } catch (error: any) {
        console.error("GameStateStore: Error deleting category:", error);
        set({ gameError: error.message });
    }
  },
  deleteWorldEntity: async (category, entity) => {
    try {
        const gameSession = get()._getGameSession();
        const updatedSnapshot = await gameSession.deleteWorldEntity(category, entity);
        if (updatedSnapshot) {
            set({ currentSnapshot: updatedSnapshot, currentGameState: updatedSnapshot.gameState, worldStatePinnedKeys: updatedSnapshot.worldStatePinnedKeys });
        }
    } catch (error: any) {
        console.error("GameStateStore: Error deleting entity:", error);
        set({ gameError: error.message });
    }
  },
  editWorldKeyValue: async (key, value) => {
    try {
        const gameSession = get()._getGameSession();
        const updatedSnapshot = await gameSession.editWorldKeyValue(key, value);
        if (updatedSnapshot) {
            set({ currentSnapshot: updatedSnapshot, currentGameState: updatedSnapshot.gameState, worldStatePinnedKeys: updatedSnapshot.worldStatePinnedKeys });
        }
    } catch (error: any) {
        console.error("GameStateStore: Error editing key-value:", error);
        set({ gameError: error.message });
    }
  },
  deleteWorldKey: async (key) => {
    try {
        const gameSession = get()._getGameSession();
        const updatedSnapshot = await gameSession.deleteWorldKey(key);
        if (updatedSnapshot) {
            set({ currentSnapshot: updatedSnapshot, currentGameState: updatedSnapshot.gameState, worldStatePinnedKeys: updatedSnapshot.worldStatePinnedKeys });
        }
    } catch (error: any) {
        console.error("GameStateStore: Error deleting key:", error);
        set({ gameError: error.message });
    }
  },
}));