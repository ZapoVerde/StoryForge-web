// src/state/useLogStore.ts

import { create } from 'zustand';
import { LogEntry } from '../models/LogEntry'; // Assuming LogEntry model is available
import { LogViewMode } from '../utils/types'; // We'll define LogViewMode here




interface LogState {
  logEntries: LogEntry[];
  selectedLogViewModes: LogViewMode[];
  isLoading: boolean;
  error: string | null;

  // Actions
  setLogEntries: (entries: LogEntry[]) => void; // To be called by useGameStateStore after a turn
  setSelectedLogViewModes: (modes: LogViewMode[]) => void;
  // Potentially fetch logs if we implement persistent log storage separate from GameSnapshot
  fetchLogs: (snapshotId: string) => Promise<void>;
}

export const useLogStore = create<LogState>((set, get) => ({
  logEntries: [],
  selectedLogViewModes: [LogViewMode.NARRATOR_OUTPUT, LogViewMode.USER_INPUT, LogViewMode.DIGEST_LINES], // Default selection
  isLoading: false,
  error: null,

  setLogEntries: (entries) => set({ logEntries: entries }),

  setSelectedLogViewModes: (modes) => set({ selectedLogViewModes: modes }),

  fetchLogs: async (snapshotId) => {
    set({ isLoading: true, error: null });
    try {
      // In MVP, logs are part of GameSnapshot. So this would primarily
      // fetch the GameSnapshot and then extract its logs.
      // E.g., const snapshot = await gameRepository.getGameSnapshot(userId, snapshotId);
      // set({ logEntries: snapshot?.logs || [], isLoading: false });
      set({ isLoading: false }); // Placeholder
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      console.error("Error fetching logs:", error);
    }
  },
}));