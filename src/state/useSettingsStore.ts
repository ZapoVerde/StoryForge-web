// src/state/useSettingsStore.ts

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AiConnection } from '../models/AiConnection';
import { gameRepository } from '../data/repositories/gameRepository';
import { generateUuid } from '../utils/uuid';

interface SettingsState {
  aiConnections: AiConnection[];
  selectedConnectionId: string | null;
  isLoadingConnections: boolean;
  connectionsError: string | null;
  useDummyNarrator: boolean;
  themeMode: 'light' | 'dark';
  fetchAiConnections: (userId: string) => Promise<void>;
  addAiConnection: (userId: string, connection: Omit<AiConnection, 'id' | 'createdAt' | 'lastUpdated'>) => Promise<AiConnection | null>;
  updateAiConnection: (userId: string, connection: AiConnection) => Promise<AiConnection | null>;
  deleteAiConnection: (userId: string, connectionId: string) => Promise<void>;
  setSelectedConnectionId: (id: string | null) => void;
  setUseDummyNarrator: (enabled: boolean) => void;
  setThemeMode: (mode: 'light' | 'dark') => void;
  reset: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      // --- Initial State Values ---
      aiConnections: [],
      selectedConnectionId: null,
      isLoadingConnections: false,
      connectionsError: null,
      useDummyNarrator: false,
      themeMode: 'light',

      // --- Actions ---
      fetchAiConnections: async (userId) => {
        set({ isLoadingConnections: true, connectionsError: null });
        try {
          const connections = await gameRepository.getAiConnections(userId);
          set({
            aiConnections: connections,
            isLoadingConnections: false,
            selectedConnectionId: get().selectedConnectionId && connections.some(c => c.id === get().selectedConnectionId)
              ? get().selectedConnectionId
              : (connections.length > 0 ? connections[0].id : null)
          });
        } catch (error: any) {
          set({ connectionsError: error.message, isLoadingConnections: false });
        }
      },
      addAiConnection: async (userId, newConnectionData) => {
        // ... (rest of the function is correct)
        set({ isLoadingConnections: true, connectionsError: null });
        try {
          const newId = generateUuid();
          const now = new Date().toISOString();
          const connection: AiConnection = {
            ...newConnectionData,
            id: newId,
            createdAt: now,
            lastUpdated: now,
          };
          await gameRepository.saveAiConnection(userId, connection);
          set(state => {
            const updatedConnections = [...state.aiConnections, connection].sort((a, b) => a.displayName.localeCompare(b.displayName));
            return {
              aiConnections: updatedConnections,
              isLoadingConnections: false,
              selectedConnectionId: state.selectedConnectionId || newId
            };
          });
          return connection;
        } catch (error: any) {
          set({ connectionsError: error.message, isLoadingConnections: false });
          return null;
        }
      },
      updateAiConnection: async (userId, updatedConnection) => {
        // ... (rest of the function is correct)
        set({ isLoadingConnections: true, connectionsError: null });
        try {
          const now = new Date().toISOString();
          const connectionToSave = { ...updatedConnection, lastUpdated: now };
          await gameRepository.saveAiConnection(userId, connectionToSave);
          set(state => {
            const updatedConnections = state.aiConnections.map(conn =>
              conn.id === updatedConnection.id ? connectionToSave : conn
            ).sort((a, b) => a.displayName.localeCompare(b.displayName));
            return {
              aiConnections: updatedConnections,
              isLoadingConnections: false,
            };
          });
          return connectionToSave;
        } catch (error: any) {
          set({ connectionsError: error.message, isLoadingConnections: false });
          return null;
        }
      },
      deleteAiConnection: async (userId, connectionId) => {
        // ... (rest of the function is correct)
        set({ isLoadingConnections: true, connectionsError: null });
        try {
          await gameRepository.deleteAiConnection(userId, connectionId);
          set(state => {
            const updatedConnections = state.aiConnections.filter(conn => conn.id !== connectionId);
            let newSelectedId = state.selectedConnectionId;
            if (newSelectedId === connectionId) {
                newSelectedId = updatedConnections.length > 0 ? updatedConnections[0].id : null;
            }
            return {
              aiConnections: updatedConnections.sort((a, b) => a.displayName.localeCompare(b.displayName)),
              selectedConnectionId: newSelectedId,
              isLoadingConnections: false,
            };
          });
        } catch (error: any) {
          set({ connectionsError: error.message, isLoadingConnections: false });
        }
      },
      setSelectedConnectionId: (id) => set({ selectedConnectionId: id }),
      setUseDummyNarrator: (enabled) => set({ useDummyNarrator: enabled }),
      setThemeMode: (mode) => set({ themeMode: mode }),
      
      // --- CORRECTED RESET ACTION ---
      reset: () => {
        console.log("Resetting SettingsStore.");
        // Set the non-persisted state back to initial values.
        // Persisted values will be handled by the middleware on next login/page load.
        set({
          aiConnections: [],
          isLoadingConnections: false,
          connectionsError: null,
          // We don't need to reset the persisted parts (selectedConnectionId, themeMode, etc.)
          // as they will be rehydrated or re-fetched on the next session.
        });
      },
    }),
    {
      name: 'storyforge-app-settings',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        selectedConnectionId: state.selectedConnectionId,
        useDummyNarrator: state.useDummyNarrator,
        themeMode: state.themeMode,
      }),
    }
  )
);