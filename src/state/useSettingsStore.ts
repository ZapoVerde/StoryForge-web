// src/state/useSettingsStore.ts

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware'; // For persisting non-sensitive settings
import { AiConnection } from '../models/AiConnection';
import { gameRepository } from '../data/repositories/gameRepository'; // For AI connection persistence
import { generateUuid } from '../utils/uuid'; // For generating new connection IDs

interface SettingsState {
  // AI Connections
  aiConnections: AiConnection[];
  selectedConnectionId: string | null; // The currently selected AI connection for gameplay
  isLoadingConnections: boolean;
  connectionsError: string | null;

  // Global app settings
  useDummyNarrator: boolean;
  themeMode: 'light' | 'dark'; // Example for future theme setting

  // Actions
  fetchAiConnections: (userId: string) => Promise<void>;
  addAiConnection: (userId: string, connection: Omit<AiConnection, 'id' | 'createdAt' | 'lastUpdated'>) => Promise<AiConnection | null>;
  updateAiConnection: (userId: string, connection: AiConnection) => Promise<AiConnection | null>;
  deleteAiConnection: (userId: string, connectionId: string) => Promise<void>;
  setSelectedConnectionId: (id: string | null) => void;

  setUseDummyNarrator: (enabled: boolean) => void;
  setThemeMode: (mode: 'light' | 'dark') => void;
}

// Zustand store for application settings
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      // Initial state for AI Connections
      aiConnections: [],
      selectedConnectionId: null,
      isLoadingConnections: false,
      connectionsError: null,

      // Initial state for other settings
      useDummyNarrator: false, // Default to false
      themeMode: 'light', // Default theme

      // Actions for AI Connections
      fetchAiConnections: async (userId) => {
        set({ isLoadingConnections: true, connectionsError: null });
        try {
          const connections = await gameRepository.getAiConnections(userId);
          set({
            aiConnections: connections,
            isLoadingConnections: false,
            // If no connection is selected or the selected one is gone, pick the first one
            selectedConnectionId: get().selectedConnectionId && connections.some(c => c.id === get().selectedConnectionId)
              ? get().selectedConnectionId
              : (connections.length > 0 ? connections[0].id : null)
          });
        } catch (error: any) {
          set({ connectionsError: error.message, isLoadingConnections: false });
          console.error("Error fetching AI connections:", error);
        }
      },

      addAiConnection: async (userId, newConnectionData) => {
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
            const updatedConnections = [...state.aiConnections, connection].sort((a, b) => a.displayName.localeCompare(b.displayName)); // Keep sorted
            return {
              aiConnections: updatedConnections,
              isLoadingConnections: false,
              selectedConnectionId: state.selectedConnectionId || newId // Auto-select if nothing selected
            };
          });
          return connection;
        } catch (error: any) {
          set({ connectionsError: error.message, isLoadingConnections: false });
          console.error("Error adding AI connection:", error);
          return null;
        }
      },

      updateAiConnection: async (userId, updatedConnection) => {
        set({ isLoadingConnections: true, connectionsError: null });
        try {
          const now = new Date().toISOString();
          const connectionToSave = { ...updatedConnection, lastUpdated: now };
          await gameRepository.saveAiConnection(userId, connectionToSave);
          set(state => {
            const updatedConnections = state.aiConnections.map(conn =>
              conn.id === updatedConnection.id ? connectionToSave : conn
            ).sort((a, b) => a.displayName.localeCompare(b.displayName)); // Keep sorted
            return {
              aiConnections: updatedConnections,
              isLoadingConnections: false,
            };
          });
          return connectionToSave;
        } catch (error: any) {
          set({ connectionsError: error.message, isLoadingConnections: false });
          console.error("Error updating AI connection:", error);
          return null;
        }
      },

      deleteAiConnection: async (userId, connectionId) => {
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
              aiConnections: updatedConnections.sort((a, b) => a.displayName.localeCompare(b.displayName)), // Keep sorted
              selectedConnectionId: newSelectedId,
              isLoadingConnections: false,
            };
          });
        } catch (error: any) {
          set({ connectionsError: error.message, isLoadingConnections: false });
          console.error("Error deleting AI connection:", error);
        }
      },

      setSelectedConnectionId: (id) => set({ selectedConnectionId: id }),

      // Actions for other settings
      setUseDummyNarrator: (enabled) => set({ useDummyNarrator: enabled }),
      setThemeMode: (mode) => set({ themeMode: mode }),
    }),
    {
      name: 'storyforge-app-settings', // Name of the storage item
      storage: createJSONStorage(() => localStorage), // Use localStorage
      partialize: (state) => ({ // Only persist non-sensitive or non-dynamic parts
        selectedConnectionId: state.selectedConnectionId,
        useDummyNarrator: state.useDummyNarrator,
        themeMode: state.themeMode,
        // aiConnections are fetched dynamically, not persisted directly via Zustand middleware
        // because they come from Firestore and might contain sensitive API keys.
        // We *do* store them in Firestore, but this `persist` middleware is for local-only settings.
      }),
      // Rehydration logic for aiConnections will be in fetchAiConnections.
    }
  )
);