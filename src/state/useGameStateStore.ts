// src/state/useGameStateStore.ts

import { create } from 'zustand';
import type {  StoreApi } from 'zustand';
import { useSettingsStore } from './useSettingsStore';
import type { GameSnapshot, GameState, LogEntry, Message } from '../models';
import type { IGameSession } from '../logic/gameSession';
import { debugLog, errorLog } from '../utils/debug';

// Module-level variable to hold the injected GameSession instance
let _gameSessionInstance: IGameSession | null = null;

export const initializeGameStateStore = (gameSession: IGameSession) => {
  if (_gameSessionInstance === null) {
    _gameSessionInstance = gameSession;
    debugLog('%c[useGameStateStore.ts] GameSession instance injected successfully.', 'color: green;');
  } else {
    debugLog('[useGameStateStore.ts] Attempted to re-inject GameSession instance. This should only happen once.');
  }
};

// --- Define State and Actions Interfaces Separately ---
interface GameStateState {
  currentSnapshot: GameSnapshot | null;
  narratorInputText: string;
  narratorScrollPosition: number;
  gameError: string | null;
  gameLoading: boolean; // This should only be true for major loading operations (initial game load, switching games)
  isProcessingTurn: boolean; // This is for AI turn processing, separate from gameLoading
}

interface GameStateActions {
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
  toggleWorldStatePin: (keyPath: string, type: 'variable' | 'entity' | 'category') => Promise<void>;
  reset: () => void;
}

// Combine them into the final store type
type GameStateStore = GameStateState & GameStateActions;

// --- Define the initial state ---
const initialState: GameStateState = {
  currentSnapshot: null,
  narratorInputText: '',
  narratorScrollPosition: 0,
  gameError: null,
  gameLoading: false, // Initial state: not loading
  isProcessingTurn: false,
};

// --- Create the store with separated actions ---
export const useGameStateStore = create<GameStateStore>((set, get) => {
  const getGameSession = (): IGameSession => {
    if (!_gameSessionInstance) {
      errorLog('%c[useGameStateStore.ts] CRITICAL ERROR: GameSession instance is NULL when getGameSession() called!', 'color: red; font-weight: bold;');
      throw new Error("Game session instance not initialized.");
    }
    return _gameSessionInstance;
  };

    // Helper to sync state from a snapshot
    const syncStateWithSnapshot = (snapshot: GameSnapshot | null) => {
      // DEBUG: Log every time currentSnapshot is updated
      // Removed gameLoading from this log as it's being de-coupled for minor updates
      debugLog(`%c[useGameStateStore.ts] syncStateWithSnapshot: Updating currentSnapshot to ${snapshot ? snapshot.id : 'null'}. isProcessingTurn: ${get().isProcessingTurn}`, 'color: dodgerblue;');
      set({ currentSnapshot: snapshot });
      // After setting the snapshot, let's verify immediately
      const verifySnapshot = get().currentSnapshot;
      debugLog(`%c[useGameStateStore.ts] syncStateWithSnapshot: currentSnapshot is now ${verifySnapshot ? verifySnapshot.id : 'null'}.`, 'color: dodgerblue;');
  };

  const performWorldStateUpdate = async (updateFn: (session: IGameSession) => Promise<GameSnapshot | null>) => {
    // DEBUG: Log start of any world state modification action
    debugLog('%c[useGameStateStore.ts] performWorldStateUpdate: Starting a world state modification.', 'color: purple;');
    // It's crucial NOT to set gameLoading: true here, as this is for minor UI updates.
    // AuthOrchestrator relies on gameLoading only for major app-level loads.
    set({ gameError: null });
    try {
        const session = getGameSession();
        const updatedSnapshot = await updateFn(session);
        syncStateWithSnapshot(updatedSnapshot);
    } catch (error: any) {
        errorLog("[useGameStateStore.ts] performWorldStateUpdate: Error during update:", error);
        set({ gameError: error.message });
    } finally {
        // This is a crucial safety measure. Even if `gameLoading` wasn't explicitly set to `true`
        // by this function, ensuring it's `false` here guarantees the global loading screen
        // is dismissed after any world state modification.
        set({ gameLoading: false });
        debugLog('[useGameStateStore.ts] performWorldStateUpdate: Finished a world state modification.');
    }
  };


    // Return the state AND actions. Actions are defined here once.
    return {
        ...initialState,

        initializeGame: async (userId, cardId, existingSnapshotId) => {
          debugLog(`[useGameStateStore.ts] initializeGame action: userId=${userId}, cardId=${cardId}, existingSnapshotId=${existingSnapshotId}`);
          set({ gameLoading: true, gameError: null }); // Set gameLoading for this major operation
          try {
            const gameSession = getGameSession();
            await gameSession.initializeGame(userId, cardId, existingSnapshotId);
            syncStateWithSnapshot(gameSession.getCurrentGameSnapshot());
          } catch (error: any) {
            errorLog("[useGameStateStore.ts] initializeGame action ERROR:", error);
            set({ gameError: error.message });
          } finally {
            set({ gameLoading: false }); // Reset gameLoading regardless of success/failure
          }
        },

        processFirstNarratorTurn: async () => {
          debugLog('[useGameStateStore.ts] processFirstNarratorTurn action started.');
          set({ isProcessingTurn: true, gameError: null });
          const useDummyNarrator = useSettingsStore.getState().useDummyNarrator;
          try {
            const gameSession = getGameSession();
            const updatedSnapshot = await gameSession.processFirstNarratorTurn(useDummyNarrator);
            syncStateWithSnapshot(updatedSnapshot);
          } catch (error: any) {
             errorLog("[useGameStateStore.ts] processFirstNarratorTurn action ERROR:", error);
             set({ gameError: error.message });
          } finally {
            set({ isProcessingTurn: false });
            debugLog('[useGameStateStore.ts] processFirstNarratorTurn action finished.');
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
            set({ gameLoading: true, gameError: null }); // Set gameLoading for this major operation
            try {
                const gameSession = getGameSession();
                await gameSession.loadGame(userId, snapshotId);
                syncStateWithSnapshot(gameSession.getCurrentGameSnapshot());
            } catch (error: any) {
                errorLog("[useGameStateStore.ts] loadGame action ERROR:", error);
                set({ gameError: error.message });
            } finally {
                set({ gameLoading: false }); // Reset gameLoading regardless of success/failure
                debugLog('[useGameStateStore.ts] loadGame action finished.');
            }
        },

        loadLastActiveGame: async (userId: string): Promise<boolean> => {
            debugLog('%c[useGameStateStore.ts] loadLastActiveGame action called.', 'color: blue; font-weight: bold;');
            set({ gameLoading: true, gameError: null }); // Set gameLoading for this major operation
            try {
                const gameSession = getGameSession();
                const gameLoaded = await gameSession.loadLastActiveGame(userId);
                // DEBUG: Check what gameSession.getCurrentGameSnapshot() returns immediately after load
                const snapshotAfterLoad = gameSession.getCurrentGameSnapshot();
                debugLog(`%c[useGameStateStore.ts] gameSession.getCurrentGameSnapshot() after loadLastActiveGame: ${snapshotAfterLoad ? snapshotAfterLoad.id : 'null'}`, 'color: blue;');
                
                syncStateWithSnapshot(snapshotAfterLoad); // Use the snapshot directly from session
                debugLog(`%c[useGameStateStore.ts] loadLastActiveGame action finished. Game loaded: ${gameLoaded}`, 'color: blue; font-weight: bold;');
                return gameLoaded;
            } catch (error: any) {
                errorLog("%c[useGameStateStore.ts] loadLastActiveGame action FAILED with error:", 'color: red; font-weight: bold;', error);
                set({ gameError: error.message });
                return false;
            } finally {
                set({ gameLoading: false }); // Reset gameLoading regardless of success/failure
            }
        },

        updateNarratorInputText: (text) => {
          // DEBUG: Log input text changes if not too frequent
          // debugLog(`[useGameStateStore.ts] updateNarratorInputText: "${text.substring(0, 30)}..."`);
          set({ narratorInputText: text });
        },
        updateNarratorScrollPosition: (position) => {
          // DEBUG: Log scroll position changes
          // debugLog(`[useGameStateStore.ts] updateNarratorScrollPosition: ${position}`);
          set({ narratorScrollPosition: position });
        },

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
// DEBUG: Log when selectors are accessed. Be careful, this can be noisy.
export const selectCurrentGameState = (state: GameStateStore): GameState | null => {
  const gameState = state.currentSnapshot?.gameState ?? null;
  // debugLog(`[useGameStateStore.ts] Selector: selectCurrentGameState. State ID: ${state.currentSnapshot?.id || 'null'}. GameState: ${gameState ? 'present' : 'null'}`);
  return gameState;
};
export const selectGameLogs = (state: GameStateStore): LogEntry[] => {
  const logs = state.currentSnapshot?.logs ?? [];
  // debugLog(`[useGameStateStore.ts] Selector: selectGameLogs. State ID: ${state.currentSnapshot?.id || 'null'}. Logs Count: ${logs.length}`);
  return logs;
};
export const selectConversationHistory = (state: GameStateStore): Message[] => {
  const history = state.currentSnapshot?.conversationHistory ?? [];
  // debugLog(`[useGameStateStore.ts] Selector: selectConversationHistory. State ID: ${state.currentSnapshot?.id || 'null'}. History Count: ${history.length}`);
  return history;
};
export const selectWorldStatePinnedKeys = (state: GameStateStore): string[] => {
  const pinnedKeys = state.currentSnapshot?.worldStatePinnedKeys ?? [];
  // debugLog(`[useGameStateStore.ts] Selector: selectWorldStatePinnedKeys. State ID: ${state.currentSnapshot?.id || 'null'}. Pinned Keys Count: ${pinnedKeys.length}`);
  return pinnedKeys;
};