// src/state/useGameStateStore.ts

import { create } from 'zustand';
import { GameSnapshot, GameState, LogEntry, Message } from '../models/index';
import { gameSession } from '../logic/gameSession';
import { flattenJsonObject, getNestedValue } from '../utils/jsonUtils'; // Import flattenJsonObject and getNestedValue (will add getNestedValue to jsonUtils)

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
    set({ gameLoading: true, gameError: null });
    try {
      // Stub: Replace with actual gameSession call and state update
      // await gameSession.initializeGame(userId, cardId, existingSnapshotId);
      // const snapshot = gameSession.getCurrentGameSnapshot();
      // if (snapshot) {
      //   set({
      //     currentSnapshot: snapshot,
      //     currentPromptCardId: cardId,
      //     currentGameState: snapshot.gameState,
      //     gameLogs: snapshot.logs || [],
      //     conversationHistory: snapshot.conversationHistory || [],
      //   });
      // }
      // Placeholder for testing:
      const dummySnapshot: GameSnapshot = {
        id: 'dummy-game-1',
        userId: userId,
        promptCardId: cardId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        currentTurn: 0,
        gameState: {
          narration: "Welcome to the dummy game!",
          worldState: {
            player: {
              "#you": {
                hp: 100,
                mana: 50,
                tag: 'character'
              }
            },
            npcs: {
              "#goblin_1": {
                hp: 20,
                weapon: "axe",
                tag: 'character'
              },
              "#fox": {
                trust: 75,
                status: "friendly",
                tag: 'character'
              }
            },
            locations: {
                "@deepwood": {
                    weather: "foggy",
                    season: "autumn",
                    tag: 'location'
                }
            },
            inventory: {
                sword: 1,
                shield: 1
            },
            quests: {
                main: {
                    status: "active",
                    objective: "Find the lost artifact"
                }
            }
          },
          scene: {
            location: "@deepwood",
            present: ["player.#you", "npcs.#fox"],
          },
        },
        conversationHistory: [],
        logs: [],
      };
      set({
        currentSnapshot: dummySnapshot,
        currentPromptCardId: cardId,
        currentGameState: dummySnapshot.gameState,
        gameLogs: dummySnapshot.logs || [],
        conversationHistory: dummySnapshot.conversationHistory || [],
      });
      set({ gameLoading: false });
    } catch (error: any) {
      set({ gameError: error.message, gameLoading: false });
      console.error("Error initializing game:", error);
    }
  },

  processPlayerAction: async (action) => {
    set({ gameLoading: true, gameError: null });
    try {
      // Stub: Replace with actual gameSession call
      // const { aiProse, newLogEntries, updatedSnapshot } = await gameSession.processPlayerAction(action);
      // set({
      //   currentSnapshot: updatedSnapshot,
      //   currentGameState: updatedSnapshot.gameState,
      //   gameLogs: updatedSnapshot.logs,
      //   conversationHistory: updatedSnapshot.conversationHistory,
      //   narratorInputText: '',
      // });
      // Placeholder for testing:
      set((state) => {
        const newLogEntry: LogEntry = {
          turnNumber: (state.currentSnapshot?.currentTurn || 0) + 1,
          timestamp: new Date().toISOString(),
          userInput: action,
          narratorOutput: `AI responds to: "${action}". Some new event happens...`,
          digestLines: [{ text: `User acted: ${action}`, importance: 3 }],
          deltas: null,
          errorFlags: [],
          modelSlugUsed: 'dummy-model',
        };
        const updatedLogs = [...state.gameLogs, newLogEntry];
        const updatedHistory = [...state.conversationHistory, { role: 'user', content: action }, { role: 'assistant', content: newLogEntry.narratorOutput }];
        const updatedSnapshot = state.currentSnapshot ? {
            ...state.currentSnapshot,
            currentTurn: newLogEntry.turnNumber,
            logs: updatedLogs,
            conversationHistory: updatedHistory,
            updatedAt: new Date().toISOString(),
        } : null;

        return {
          gameLogs: updatedLogs,
          conversationHistory: updatedHistory,
          narratorInputText: '',
          currentSnapshot: updatedSnapshot,
          currentGameState: updatedSnapshot?.gameState, // Ensure game state is updated too
        };
      });
      set({ gameLoading: false });
    } catch (error: any) {
      set({ gameError: error.message, gameLoading: false });
      console.error("Error processing player action:", error);
    }
  },

  saveGame: async () => {
    if (!get().currentUserId || !get().currentSnapshot) {
        console.warn("Cannot save game: user or game snapshot not initialized.");
        return;
    }
    // await gameSession.saveGame();
    // For stub, just log
    console.log(`Stub: Game snapshot ${get().currentSnapshot?.id} saved.`);
  },
  loadGame: async (snapshotId) => {
    // Stub: Implement load logic via gameSession
    console.log(`Stub: Loading game ${snapshotId}`);
  },

  toggleWorldStatePin: (keyPath: string, type: PinToggleType) => {
    set((state) => {
      const currentWorldState = state.currentGameState?.worldState || {};
      const newPinnedKeys = new Set(state.worldStatePinnedKeys);

      const isCurrentlyPinned = (path: string) => newPinnedKeys.has(path);

      let relevantKeysToToggle: string[] = [];

      if (type === 'variable') {
        relevantKeysToToggle = [keyPath];
      } else if (type === 'entity') {
        // Find all variables under this entity
        const flattenedEntity = flattenJsonObject(getNestedValue(currentWorldState, keyPath.split('.')), keyPath);
        relevantKeysToToggle = Object.keys(flattenedEntity).filter(k => {
          // Exclude the entity path itself if it's not a direct variable (e.g., 'npcs.#fox' vs 'npcs.#fox.hp')
          return k.split('.').length > keyPath.split('.').length;
        });
      } else if (type === 'category') {
        // Find all variables under this category
        const flattenedCategory = flattenJsonObject(getNestedValue(currentWorldState, keyPath.split('.')), keyPath);
        relevantKeysToToggle = Object.keys(flattenedCategory).filter(k => {
          return k.split('.').length > keyPath.split('.').length;
        });
      }

      // Determine if we should pin or unpin based on the first relevant key's current state
      const shouldPin = relevantKeysToToggle.length > 0
        ? !isCurrentlyPinned(relevantKeysToToggle[0]) // Toggle based on first key
        : true; // If no keys found, default to pinning (e.g., new category/entity)

      relevantKeysToToggle.forEach(key => {
        if (shouldPin) {
          newPinnedKeys.add(key);
        } else {
          newPinnedKeys.delete(key);
        }
      });

      return { worldStatePinnedKeys: Array.from(newPinnedKeys) };
    });
  },

  unpinAllForEntity: (entityPath: string) => {
    set((state) => {
      const newPinnedKeys = new Set(state.worldStatePinnedKeys);
      // Remove all keys that start with the entityPath
      state.worldStatePinnedKeys.forEach(key => {
        if (key.startsWith(entityPath + '.')) {
          newPinnedKeys.delete(key);
        }
      });
      return { worldStatePinnedKeys: Array.from(newPinnedKeys) };
    });
  },

  unpinIndividualVariable: (variablePath: string) => {
    set((state) => ({
      worldStatePinnedKeys: state.worldStatePinnedKeys.filter(key => key !== variablePath),
    }));
  },

  updateNarratorInputText: (text) => set({ narratorInputText: text }),
  updateNarratorScrollPosition: (position) => set({ narratorScrollPosition: position }),

  renameWorldCategory: async (oldName, newName) => { console.log(`Stub: Renaming category ${oldName} to ${newName}`); /* Implement logic */ },
  renameWorldEntity: async (category, oldName, newName) => { console.log(`Stub: Renaming entity ${oldName} in ${category} to ${newName}`); /* Implement logic */ },
  deleteWorldCategory: async (category) => { console.log(`Stub: Deleting category ${category}`); /* Implement logic */ },
  deleteWorldEntity: async (category, entity) => { console.log(`Stub: Deleting entity ${entity} in ${category}`); /* Implement logic */ },
  editWorldKeyValue: async (key, value) => { console.log(`Stub: Editing world key ${key} with value ${value}`); /* Implement logic */ },
  deleteWorldKey: async (key) => { console.log(`Stub: Deleting world key ${key}`); /* Implement logic */ },
}));