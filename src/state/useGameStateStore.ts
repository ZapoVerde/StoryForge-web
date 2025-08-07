// src/state/useGameStateStore.ts

import { create } from 'zustand';
import type { StoreApi } from 'zustand';
import { useSettingsStore } from './useSettingsStore';
import type { GameSnapshot, GameState, LogEntry, Message } from '../models';
import type { IGameSession } from '../logic/gameSession';
import { debugLog, errorLog } from '../utils/debug';

let _gameSessionInstance: IGameSession | null = null;

export const initializeGameStateStore = (gameSession: IGameSession) => {
  if (_gameSessionInstance === null) {
    _gameSessionInstance = gameSession;
    debugLog('%c[useGameStateStore.ts] GameSession instance injected successfully.', 'color: green;');
  } else {
    debugLog('[useGameStateStore.ts] Attempted to re-inject GameSession instance. This should only happen once.');
  }
};

interface GameStateState {
  currentSnapshot: GameSnapshot | null;
  narratorInputText: string;
  narratorScrollPosition: number;
  gameError: string | null;
  gameLoading: boolean;
  isProcessingTurn: boolean;
}

interface GameStateActions {
  initializeGame: (userId: string, cardId: string, existingSnapshotId?: string) => Promise<void>;
  processPlayerAction: (action: string) => Promise<void>;
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
  toggleWorldStatePin: (keyPath: string, type: 'variable' | 'entity' | 'category') => Promise<void>;
  reset: () => void;
}

type GameStateStore = GameStateState & GameStateActions;

const initialState: GameStateState = {
  currentSnapshot: null,
  narratorInputText: '',
  narratorScrollPosition: 0,
  gameError: null,
  gameLoading: false,
  isProcessingTurn: false,
};

export const useGameStateStore = create<GameStateStore>((set, get) => {
  const getGameSession = (): IGameSession => {
    if (!_gameSessionInstance) {
      errorLog('%c[useGameStateStore.ts] CRITICAL ERROR: GameSession instance is NULL when getGameSession() called!', 'color: red; font-weight: bold;');
      throw new Error("Game session instance not initialized.");
    }
    return _gameSessionInstance;
  };

  const syncStateWithSnapshot = (snapshot: GameSnapshot | null) => {
    debugLog(`%c[useGameStateStore.ts] syncStateWithSnapshot: Updating currentSnapshot to ${snapshot ? snapshot.id : 'null'}. isProcessingTurn: ${get().isProcessingTurn}`, 'color: dodgerblue;');
    set({ currentSnapshot: snapshot });
    const verifySnapshot = get().currentSnapshot;
    debugLog(`%c[useGameStateStore.ts] syncStateWithSnapshot: currentSnapshot is now ${verifySnapshot ? verifySnapshot.id : 'null'}.`, 'color: dodgerblue;');
  };

  const performWorldStateUpdate = async (updateFn: (session: IGameSession) => Promise<GameSnapshot | null>) => {
    debugLog('%c[useGameStateStore.ts] performWorldStateUpdate: Starting a world state modification.', 'color: purple;');
    set({ gameError: null });
    try {
      const session = getGameSession();
      const updatedSnapshot = await updateFn(session);
      syncStateWithSnapshot(updatedSnapshot);
    } catch (error: any) {
      errorLog("[useGameStateStore.ts] performWorldStateUpdate: Error during update:", error);
      set({ gameError: error.message });
    } finally {
      set({ gameLoading: false });
      debugLog('[useGameStateStore.ts] performWorldStateUpdate: Finished a world state modification.');
    }
  };

  return {
    ...initialState,

    initializeGame: async (userId, cardId, existingSnapshotId) => {
      debugLog(`[useGameStateStore.ts] initializeGame action: userId=${userId}, cardId=${cardId}, existingSnapshotId=${existingSnapshotId}`);
      set({ gameLoading: true, gameError: null }); // Set gameLoading for this major operation
      set({ currentSnapshot: null }); // IMPORTANT: Clear current snapshot immediately
      try {
        const gameSession = getGameSession();
        await gameSession.initializeGame(userId, cardId, existingSnapshotId);
        syncStateWithSnapshot(gameSession.getCurrentGameSnapshot());
      } catch (error: any) {
        errorLog("[useGameStateStore.ts] initializeGame action ERROR:", error);
        set({ gameError: error.message });
      } finally {
        set({ gameLoading: false });
      }
    },


    processPlayerAction: async (action) => {
      debugLog(`[useGameStateStore.ts] processPlayerAction action started. Action: "${action}"`);
      set({ isProcessingTurn: true, gameError: null, narratorInputText: '' });
      const useDummyNarrator = useSettingsStore.getState().useDummyNarrator;
      try {
        const gameSession = getGameSession();
        const updatedSnapshot = await gameSession.processPlayerAction(action, useDummyNarrator);
        syncStateWithSnapshot(updatedSnapshot);
      } catch (error: any) {
        errorLog("[useGameStateStore.ts] processPlayerAction action ERROR:", error);
        set({ gameError: error.message });
      } finally {
        set({ isProcessingTurn: false });
        debugLog('[useGameStateStore.ts] processPlayerAction action finished.');
      }
    },

    saveGame: async () => {
      debugLog('[useGameStateStore.ts] saveGame action called.');
      const { currentSnapshot } = get();
      if (!currentSnapshot) {
        debugLog('[useGameStateStore.ts] saveGame action: No currentSnapshot to save.');
        return;
      }
      try {
        await getGameSession().saveGame(currentSnapshot);
        debugLog(`[useGameStateStore.ts] saveGame action: Snapshot ${currentSnapshot.id} saved.`);
      } catch (error: any) {
        errorLog("[useGameStateStore.ts] saveGame action ERROR:", error);
        set({ gameError: error.message });
      }
    },

    loadGame: async (userId, snapshotId) => {
      debugLog(`[useGameStateStore.ts] loadGame action: userId=${userId}, snapshotId=${snapshotId}`);
      set({ gameLoading: true, gameError: null });
      try {
        const gameSession = getGameSession();
        await gameSession.loadGame(userId, snapshotId);
        syncStateWithSnapshot(gameSession.getCurrentGameSnapshot());
      } catch (error: any) {
        errorLog("[useGameStateStore.ts] loadGame action ERROR:", error);
        set({ gameError: error.message });
      } finally {
        set({ gameLoading: false });
        debugLog('[useGameStateStore.ts] loadGame action finished.');
      }
    },

    loadLastActiveGame: async (userId: string): Promise<boolean> => {
      debugLog('%c[useGameStateStore.ts] loadLastActiveGame action called.', 'color: blue; font-weight: bold;');
      set({ gameLoading: true, gameError: null });
      try {
        const gameSession = getGameSession();
        const gameLoaded = await gameSession.loadLastActiveGame(userId);
        const snapshotAfterLoad = gameSession.getCurrentGameSnapshot();
        debugLog(`%c[useGameStateStore.ts] gameSession.getCurrentGameSnapshot() after loadLastActiveGame: ${snapshotAfterLoad ? snapshotAfterLoad.id : 'null'}`, 'color: blue;');
        syncStateWithSnapshot(snapshotAfterLoad);
        debugLog(`%c[useGameStateStore.ts] loadLastActiveGame action finished. Game loaded: ${gameLoaded}`, 'color: blue; font-weight: bold;');
        return gameLoaded;
      } catch (error: any) {
        errorLog("%c[useGameStateStore.ts] loadLastActiveGame action FAILED with error:", 'color: red; font-weight: bold;', error);
        set({ gameError: error.message });
        return false;
      } finally {
        set({ gameLoading: false });
      }
    },

    updateNarratorInputText: (text) => set({ narratorInputText: text }),
    updateNarratorScrollPosition: (position) => set({ narratorScrollPosition: position }),

    renameWorldCategory: (oldName, newName) => performWorldStateUpdate(session => session.renameWorldCategory(oldName, newName)),
    renameWorldEntity: (category, oldName, newName) => performWorldStateUpdate(session => session.renameWorldEntity(category, oldName, newName)),
    deleteWorldCategory: (category) => performWorldStateUpdate(session => session.deleteWorldCategory(category)),
    deleteWorldEntity: (category, entity) => performWorldStateUpdate(session => session.deleteWorldEntity(category, entity)),
    editWorldKeyValue: (key, value) => performWorldStateUpdate(session => session.editWorldKeyValue(key, value)),
    deleteWorldKey: (key) => performWorldStateUpdate(session => session.deleteWorldKey(key)),
    toggleWorldStatePin: (key, type) => performWorldStateUpdate(session => session.toggleWorldStatePin(key, type)),

    reset: () => {
      debugLog('%c[useGameStateStore.ts] RESETTING GameStateStore to initialState.', 'color: red; font-weight: bold;');
      set(initialState);
    },
  };
});

// --- Selectors ---
export const selectCurrentGameState = (state: GameStateStore): GameState | null => {
  return state.currentSnapshot?.gameState ?? null;
};
export const selectGameLogs = (state: GameStateStore): LogEntry[] => {
  return state.currentSnapshot?.logs ?? [];
};
export const selectConversationHistory = (state: GameStateStore): Message[] => {
  return state.currentSnapshot?.conversationHistory ?? [];
};
export const selectWorldStatePinnedKeys = (state: GameStateStore): string[] => {
  return state.currentSnapshot?.worldStatePinnedKeys ?? [];
};
