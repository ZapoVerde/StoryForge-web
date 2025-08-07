// src/state/useGameStateStore.ts

import { create } from 'zustand';
import { useSettingsStore } from './useSettingsStore';
import type { GameSnapshot, GameState, LogEntry, Message } from '../models';
import type { IGameSession } from '../logic/gameSession';

// Module-level variable to hold the injected GameSession instance
let _gameSessionInstance: IGameSession | null = null;

/**
 * Initializes the GameStateStore with the GameSession instance.
 * This should be called once from a provider component.
 */
export const initializeGameStateStore = (gameSession: IGameSession) => {
  if (_gameSessionInstance === null) {
    _gameSessionInstance = gameSession;
    console.log("GameStateStore: GameSession instance injected.");
  }
};

// Define the initial state, excluding actions.
const initialState = {
  currentSnapshot: null,
  narratorInputText: '',
  narratorScrollPosition: 0,
  gameError: null,
  gameLoading: false,
  isProcessingTurn: false,
};

// Define the full store type including state and actions
interface GameStateStore {
  currentSnapshot: GameSnapshot | null;
  narratorInputText: string;
  narratorScrollPosition: number;
  gameError: string | null;
  gameLoading: boolean;
  isProcessingTurn: boolean;
  initializeGame: (userId: string, cardId: string, existingSnapshotId?: string) => Promise<void>;
  processPlayerAction: (action: string) => Promise<void>;
  processFirstNarratorTurn: () => Promise<void>;
  saveGame: () => Promise<void>;
  loadGame: (userId: string, snapshotId: string) => Promise<void>;
  loadLastActiveGame: (userId: string) => Promise<boolean>;
  updateNarratorInputText: (text: string) => void;
  updateNarratorScrollPosition: (position: number) => void;
  renameWorldCategory: (oldName: string, newName: string) => Promise<void>;
  renameWorldEntity: (category: string, oldName: string, newName: string) => Promise<void>;
  deleteWorldCategory: (category: string) => Promise<void>;
  deleteWorldEntity: (category: string, entity: string) => Promise<void>;
  editWorldKeyValue: (key: string, value: any) => Promise<void>;
  deleteWorldKey: (key: string) => Promise<void>;
  reset: () => void;
  toggleWorldStatePin: (keyPath: string, type: 'variable' | 'entity' | 'category') => Promise<void>;
}

export const useGameStateStore = create<GameStateStore>((set, get) => {
  // --- Internal Helpers ---

  /**
   * Safely retrieves the game session instance, throwing an error if not initialized.
   */
  const getGameSession = (): IGameSession => {
    if (!_gameSessionInstance) {
      throw new Error("Game session instance not initialized. Ensure GameSessionAndStoreProvider is a parent component.");
    }
    return _gameSessionInstance;
  };

  /**
   * Centralized function to update the store's state from a GameSnapshot.
   */
  const syncStateWithSnapshot = (snapshot: GameSnapshot | null) => {
    set({ currentSnapshot: snapshot });
  };

  /**
   * Generic wrapper for performing updates that modify the world state.
   */
  const performWorldStateUpdate = async (updateFn: (session: IGameSession) => Promise<GameSnapshot | null>) => {
    set({ gameLoading: true, gameError: null }); // Using gameLoading for this quick action
    try {
      const session = getGameSession();
      const updatedSnapshot = await updateFn(session);
      syncStateWithSnapshot(updatedSnapshot);
    } catch (error: any) {
      console.error("Error performing world state update:", error);
      set({ gameError: error.message });
    } finally {
      set({ gameLoading: false });
    }
  };
  return {
    ...initialState,

    // --- Actions ---

    initializeGame: async (userId, cardId, existingSnapshotId) => {
      set({ gameLoading: true, gameError: null });
      try {
        const gameSession = getGameSession();
        await gameSession.initializeGame(userId, cardId, existingSnapshotId);
        syncStateWithSnapshot(gameSession.getCurrentGameSnapshot());
      } catch (error: any) {
        set({ gameError: error.message, gameLoading: false });
      }
    },

    processFirstNarratorTurn: async () => {
      set({ isProcessingTurn: true, gameError: null });
      const useDummyNarrator = useSettingsStore.getState().useDummyNarrator;
      try {
        const gameSession = getGameSession();
        const updatedSnapshot = await gameSession.processFirstNarratorTurn(useDummyNarrator);
        syncStateWithSnapshot(updatedSnapshot);
      } catch (error: any) {
        set({ gameError: error.message, isProcessingTurn: false });
      }
    },

    processPlayerAction: async (action) => {
      set({ isProcessingTurn: true, gameError: null, narratorInputText: '' });
      const useDummyNarrator = useSettingsStore.getState().useDummyNarrator;
      try {
        const gameSession = getGameSession();
        const updatedSnapshot = await gameSession.processPlayerAction(action, useDummyNarrator);
        syncStateWithSnapshot(updatedSnapshot);
      } catch (error: any) {
        set({ gameError: error.message, isProcessingTurn: false });
      }
    },

    saveGame: async () => {
      const { currentSnapshot } = get();
      if (!currentSnapshot) return;
      try {
        await getGameSession().saveGame(currentSnapshot);
      } catch (error: any) {
        set({ gameError: error.message });
      }
    },

    loadGame: async (userId, snapshotId) => {
      set({ gameLoading: true, gameError: null });
      try {
        const gameSession = getGameSession();
        await gameSession.loadGame(userId, snapshotId);
        syncStateWithSnapshot(gameSession.getCurrentGameSnapshot());
      } catch (error: any) {
        set({ gameError: error.message, gameLoading: false });
      }
    },
    
    loadLastActiveGame: async (userId: string): Promise<boolean> => {
        set({ gameLoading: true, gameError: null });
        try {
            const gameSession = getGameSession();
            const gameLoaded = await gameSession.loadLastActiveGame(userId);
            syncStateWithSnapshot(gameSession.getCurrentGameSnapshot());
            set({ gameLoading: false });
            return gameLoaded;
        } catch (error: any) {
            set({ gameError: error.message, gameLoading: false });
            return false;
        }
    },

    updateNarratorInputText: (text) => set({ narratorInputText: text }),
    updateNarratorScrollPosition: (position) => set({ narratorScrollPosition: position }),

    // Refactored World State modifications using the helper
    renameWorldCategory: (oldName, newName) => performWorldStateUpdate(session => session.renameWorldCategory(oldName, newName)),
    renameWorldEntity: (category, oldName, newName) => performWorldStateUpdate(session => session.renameWorldEntity(category, oldName, newName)),
    deleteWorldCategory: (category) => performWorldStateUpdate(session => session.deleteWorldCategory(category)),
    deleteWorldEntity: (category, entity) => performWorldStateUpdate(session => session.deleteWorldEntity(category, entity)),
    editWorldKeyValue: (key, value) => performWorldStateUpdate(session => session.editWorldKeyValue(key, value)),
    deleteWorldKey: (key) => performWorldStateUpdate(session => session.deleteWorldKey(key)),
    toggleWorldStatePin: (key, type) => performWorldStateUpdate(session => session.toggleWorldStatePin(key, type)),

    reset: () => {
      console.log("Resetting GameStateStore.");
      set(initialState);
    },
  };
});

// --- Selectors ---
// Components should use these selectors to get derived data from the snapshot.
export const selectCurrentGameState = (state: GameStateStore): GameState | null => state.currentSnapshot?.gameState ?? null;
export const selectGameLogs = (state: GameStateStore): LogEntry[] => state.currentSnapshot?.logs ?? [];
export const selectConversationHistory = (state: GameStateStore): Message[] => state.currentSnapshot?.conversationHistory ?? [];
export const selectWorldStatePinnedKeys = (state: GameStateStore): string[] => state.currentSnapshot?.worldStatePinnedKeys ?? [];