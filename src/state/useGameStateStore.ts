// src/state/useGameStateStore.ts
import { create } from 'zustand';
import type { GameSnapshot, GameState, LogEntry, Message } from '../models';
import type { IGameSession } from '../logic/gameSession';
import { useSettingsStore } from './useSettingsStore';
import { usePromptCardStore } from './usePromptCardStore';
import { promptCardRepository } from '../data/repositories/promptCardRepository';
import { debugLog, errorLog } from '../utils/debug';
import { produce } from 'immer';
import { gameRepository } from '../data/repositories/gameRepository';
import { aiConnectionRepository } from '../data/repositories/aiConnectionRepository';

// External GameSession service instance
let _gameSessionService: IGameSession | null = null;

export const initializeGameStateStore = (gameSession: IGameSession) => {
  if (_gameSessionService === null) {
    _gameSessionService = gameSession;
    debugLog('%c[useGameStateStore.ts] GameSession service injected successfully.', 'color: green;');
  }
};

interface GameStateState {
  currentSnapshot: GameSnapshot | null;
  maxTurn: number | null;
  narratorInputText: string;
  narratorScrollPosition: number;
  gameError: string | null;
  gameLoading: boolean;
  isProcessingTurn: boolean;
}

interface GameStateActions {
  initializeGame: (userId: string, cardId: string, existingSnapshotId?: string) => Promise<void>;
  processPlayerAction: (action: string) => Promise<void>;
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
  processTurn: (action: string) => Promise<void>;
  navigateToTurn: (turnNumber: number) => Promise<void>;
}

type GameStateStore = GameStateState & GameStateActions;

const initialState: GameStateState = {
  currentSnapshot: null,
  narratorInputText: '',
  narratorScrollPosition: 0,
  gameError: null,
  gameLoading: false,
  isProcessingTurn: false,
  maxTurn: null, 
};

export const useGameStateStore = create<GameStateStore>((set, get) => {
  const getGameService = (): IGameSession => {
    if (!_gameSessionService) {
      throw new Error("GameSession service has not been initialized in the store.");
    }
    return _gameSessionService;
  };

  const updateSnapshotAndPersist = async (newSnapshot: GameSnapshot | null) => {
    if (!newSnapshot) {
      set({ currentSnapshot: null });
      return;
    }
    set({ currentSnapshot: newSnapshot });
    try {
      await gameRepository.saveGameSnapshot(newSnapshot.userId, newSnapshot);
      debugLog(`[useGameStateStore] Persisted snapshot ${newSnapshot.id}`);
    } catch (e: any) {
      errorLog("[useGameStateStore] Failed to persist snapshot:", e);
      set({ gameError: "Failed to save game progress." });
    }
  };

  const performWorldStateUpdate = async (
    updateFn: (service: IGameSession, snapshot: GameSnapshot) => GameSnapshot
  ) => {
    const currentState = get().currentSnapshot;
    if (!currentState) {
      set({ gameError: "No active game to update." });
      return;
    }
    set({ gameError: null });
    try {
      const service = getGameService();
      const updatedSnapshot = updateFn(service, currentState);
      await updateSnapshotAndPersist(updatedSnapshot);
    } catch (error: any) {
      errorLog("[useGameStateStore] Error during world state update:", error);
      set({ gameError: error.message });
    }
  };

  return {
    ...initialState,

    initializeGame: async (userId, cardId, existingSnapshotId) => {
      set({ gameLoading: true, gameError: null, currentSnapshot: null });
      try {
        if (existingSnapshotId) {
          await get().loadGame(userId, existingSnapshotId);
        } else {
          const card = await promptCardRepository.getPromptCard(userId, cardId);
          if (!card) throw new Error(`PromptCard with ID ${cardId} not found.`);
          usePromptCardStore.getState().setActivePromptCard(card);
          const service = getGameService();
          const initialSnapshot = service.initializeGame(userId, card);
          await updateSnapshotAndPersist(initialSnapshot);
        }
      } catch (error: any) {
        errorLog("[useGameStateStore] initializeGame action ERROR:", error);
        set({ gameError: error.message });
      } finally {
        set({ gameLoading: false });
      }
    },

    processPlayerAction: async (action) => {
      const snapshot = get().currentSnapshot;
      const card = usePromptCardStore.getState().activePromptCard;
      const maxTurn = get().maxTurn; // Get maxTurn from state

      if (!snapshot || !card) {
        set({ gameError: "Cannot process action: Game or Prompt Card not loaded." });
        return;
      }

      // DESTRUCTIVE RESUME LOGIC
      if (maxTurn !== null && snapshot.currentTurn < maxTurn) {
        const confirmed = window.confirm(
          "You are about to resume from an earlier point. This will delete all future turns from your previous timeline. This cannot be undone. Are you sure?"
        );
        if (!confirmed) {
          return; // User cancelled
        }
        // Tell the repository to delete the obsolete future turns
        await gameRepository.deleteFutureTurns(snapshot.userId, snapshot.gameId, snapshot.currentTurn);
      }

      set({ isProcessingTurn: true, gameError: null, narratorInputText: '' });
      const useDummyNarrator = useSettingsStore.getState().useDummyNarrator;
      try {
        const aiConnections = await aiConnectionRepository.getAiConnections(snapshot.userId);
        const service = getGameService();
        // The service returns a new snapshot with turn number incremented
        const processedSnapshot = await service.processPlayerAction(
          snapshot, card, action, useDummyNarrator, aiConnections
        );
        
        // Overwrite the ID to follow our new convention
        const finalSnapshot = {
          ...processedSnapshot,
          id: `${processedSnapshot.gameId}-${processedSnapshot.currentTurn}`
        };

        await updateSnapshotAndPersist(finalSnapshot);
        // After persisting, update the maxTurn to the current turn
        set({ maxTurn: finalSnapshot.currentTurn });

      } catch (error: any) {
        errorLog("[useGameStateStore] processPlayerAction action ERROR:", error);
        set({ gameError: error.message });
      } finally {
        set({ isProcessingTurn: false });
      }
    },

    loadGame: async (userId, gameId) => { // This now receives a gameId
      set({ gameLoading: true, gameError: null });
      try {
        const timeline = await gameRepository.getGameTimeline(userId, gameId);
        if (timeline.length === 0) throw new Error(`Game ${gameId} not found.`);
        
        const latestSnapshot = timeline[timeline.length - 1];
        const card = await promptCardRepository.getPromptCard(userId, latestSnapshot.promptCardId);
        if (!card) throw new Error(`PromptCard for game could not be found.`);

        usePromptCardStore.getState().setActivePromptCard(card);
        set({
          currentSnapshot: latestSnapshot,
          maxTurn: latestSnapshot.currentTurn, // Max turn is the turn number of the latest snapshot
          gameLoading: false,
        });
      } catch (error: any) {
        errorLog("[useGameStateStore] loadGame action ERROR:", error);
        set({ gameError: error.message, gameLoading: false });
      }
    },

    // ADD NEW ACTION: navigateToTurn
    navigateToTurn: async (turnNumber: number) => {
      const snapshot = get().currentSnapshot;
      if (!snapshot) return;

      set({ gameLoading: true, gameError: null });
      try {
        const targetSnapshotId = `${snapshot.gameId}-${turnNumber}`;
        const targetSnapshot = await gameRepository.getGameSnapshot(snapshot.userId, targetSnapshotId);
        if (!targetSnapshot) throw new Error(`Turn ${turnNumber} not found.`);
        
        set({ currentSnapshot: targetSnapshot, gameLoading: false });
      } catch(e: any) {
        set({ gameError: e.message, gameLoading: false });
      }
    },

    loadLastActiveGame: async (userId: string): Promise<boolean> => {
      set({ gameLoading: true, gameError: null });
      try {
        const allSnapshots = await gameRepository.getAllGameSnapshots(userId);
        if (allSnapshots.length > 0) {
          await get().loadGame(userId, allSnapshots[0].gameId); 
          return true;
        }
        return false;
      } catch (error: any) {
        errorLog("[useGameStateStore] loadLastActiveGame action FAILED with error:", error);
        set({ gameError: error.message });
        return false;
      } finally {
        set({ gameLoading: false });
      }
    },

    processTurn: (action: string) => {
      return get().processPlayerAction(action);
    },

    updateNarratorInputText: (text) => set({ narratorInputText: text }),
    updateNarratorScrollPosition: (position) => set({ narratorScrollPosition: position }),

    renameWorldCategory: (oldName, newName) =>
      performWorldStateUpdate((s, snap) => s.renameWorldCategory(snap, oldName, newName)),

    renameWorldEntity: (category, oldName, newName) =>
      performWorldStateUpdate((s, snap) => s.renameWorldEntity(snap, category, oldName, newName)),

    deleteWorldCategory: (category) =>
      performWorldStateUpdate((s, snap) => s.deleteWorldCategory(snap, category)),

    deleteWorldEntity: (category, entity) =>
      performWorldStateUpdate((s, snap) => s.deleteWorldEntity(snap, category, entity)),

    editWorldKeyValue: (key, value) =>
      performWorldStateUpdate((s, snap) => s.editWorldKeyValue(snap, key, value)),

    deleteWorldKey: (key) =>
      performWorldStateUpdate((s, snap) => s.deleteWorldKey(snap, key)),

    toggleWorldStatePin: (key, type) =>
      performWorldStateUpdate((s, snap) => s.toggleWorldStatePin(snap, key, type)),

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