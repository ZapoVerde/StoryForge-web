// src/state/useGameStateStore.ts

import { create } from 'zustand';
import { GameSnapshot, GameState, LogEntry, Message } from '../models/index';
import { flattenJsonObject, getNestedValue } from '../utils/jsonUtils'; // Still used for pinning logic
import { produce } from 'immer';
import { useSettingsStore } from './useSettingsStore';

import { IGameSession } from '../logic/gameSession'; // Import the IGameSession interface for type safety

let _gameSessionInstance: IGameSession;

export const initializeGameStateStore = (gameSession: IGameSession) => {
  if (!_gameSessionInstance) {
    _gameSessionInstance = gameSession;
    console.log("GameStateStore: GameSession instance injected.");
  } else {
    console.warn("GameStateStore: Attempted to re-initialize GameSession instance. This should only happen once.");
  }
};

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

  initializeGame: async (userId, cardId, existingSnapshotId) => {
    set({ gameLoading: true, gameError: null });
    if (!_gameSessionInstance) {
      set({ gameError: "Game session instance not initialized.", gameLoading: false });
      return;
    }
    try {
      await _gameSessionInstance.initializeGame(userId, cardId, existingSnapshotId);
      // After initialization, fetch the current state from GameSession
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
    if (!_gameSessionInstance) {
      set({ gameError: "Game session instance not initialized.", gameLoading: false });
      return;
    }
    set({ gameLoading: true, gameError: null });
    const useDummyNarrator = useSettingsStore.getState().useDummyNarrator;
    try {
      const updatedSnapshot = await _gameSessionInstance.processFirstNarratorTurn(useDummyNarrator);
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
    if (!_gameSessionInstance) {
      set({ gameError: "Game session instance not initialized.", gameLoading: false });
      return;
    }
    set({ gameLoading: true, gameError: null });
    const useDummyNarrator = useSettingsStore.getState().useDummyNarrator;
    try {
      const updatedSnapshot = await _gameSessionInstance.processPlayerAction(action, useDummyNarrator);
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
    if (!_gameSessionInstance) {
      console.error("GameSession: Cannot save game because gameSessionInstance is not set in store.");
      throw new Error("Game session not initialized in store.");
    }
    const currentSnapshot = get().currentSnapshot;
    if (currentSnapshot) {
      // The store updates pinned keys directly, so ensure snapshot has the latest
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
    if (!_gameSessionInstance) {
      set({ gameError: "Game session instance not initialized.", gameLoading: false });
      return;
    }
    set({ gameLoading: true, gameError: null });
    try {
      await _gameSessionInstance.loadGame(userId, snapshotId);
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
      const gameLoaded = await _gameSessionInstance.loadLastActiveGame(userId);
      const loadedSnapshot = _gameSessionInstance.getCurrentGameSnapshot();

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
    const updatedSnapshot = await _gameSessionInstance.renameWorldCategory(oldName, newName);
    if (updatedSnapshot) {
      set({ currentSnapshot: updatedSnapshot, currentGameState: updatedSnapshot.gameState, worldStatePinnedKeys: updatedSnapshot.worldStatePinnedKeys });
    }
  },
  renameWorldEntity: async (category, oldName, newName) => {
    const updatedSnapshot = await _gameSessionInstance.renameWorldEntity(category, oldName, newName);
    if (updatedSnapshot) {
      set({ currentSnapshot: updatedSnapshot, currentGameState: updatedSnapshot.gameState, worldStatePinnedKeys: updatedSnapshot.worldStatePinnedKeys });
    }
  },
  deleteWorldCategory: async (category) => {
    const updatedSnapshot = await _gameSessionInstance.deleteWorldCategory(category);
    if (updatedSnapshot) {
      set({ currentSnapshot: updatedSnapshot, currentGameState: updatedSnapshot.gameState, worldStatePinnedKeys: updatedSnapshot.worldStatePinnedKeys });
    }
  },
  deleteWorldEntity: async (category, entity) => {
    const updatedSnapshot = await _gameSessionInstance.deleteWorldEntity(category, entity);
    if (updatedSnapshot) {
      set({ currentSnapshot: updatedSnapshot, currentGameState: updatedSnapshot.gameState, worldStatePinnedKeys: updatedSnapshot.worldStatePinnedKeys });
    }
  },
  editWorldKeyValue: async (key, value) => {
    const updatedSnapshot = await _gameSessionInstance.editWorldKeyValue(key, value);
    if (updatedSnapshot) {
      set({ currentSnapshot: updatedSnapshot, currentGameState: updatedSnapshot.gameState, worldStatePinnedKeys: updatedSnapshot.worldStatePinnedKeys });
    }
  },
  deleteWorldKey: async (key) => {
    const updatedSnapshot = await _gameSessionInstance.deleteWorldKey(key);
    if (updatedSnapshot) {
      set({ currentSnapshot: updatedSnapshot, currentGameState: updatedSnapshot.gameState, worldStatePinnedKeys: updatedSnapshot.worldStatePinnedKeys });
    }
  },
}));