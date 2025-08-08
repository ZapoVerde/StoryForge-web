// src/state/useLogStore.ts

import { create } from 'zustand';
import { LogViewMode } from '../utils/types';
import type { LogEntry } from '../models';
import { debugLog } from '../utils/debug';

const initialState = {
  logEntries: [] as LogEntry[],
  // Default to a useful set of views
  selectedLogViewModes: [LogViewMode.USER_INPUT, LogViewMode.NARRATOR_OUTPUT, LogViewMode.DIGEST_LINES, LogViewMode.DELTAS] as LogViewMode[],
  isLoading: false,
  error: null as string | null,
};

interface LogState {
  logEntries: LogEntry[];
  selectedLogViewModes: LogViewMode[];
  isLoading: boolean;
  error: string | null;
  setLogEntries: (entries: LogEntry[]) => void;
  setSelectedLogViewModes: (modes: LogViewMode[]) => void;
  reset: () => void;
}

export const useLogStore = create<LogState>((set) => ({
  ...initialState,

  setLogEntries: (entries) => set({ logEntries: entries }),

  setSelectedLogViewModes: (modes) => set({ selectedLogViewModes: modes }),

  reset: () => {
    debugLog("Resetting LogStore.");
    set(initialState);
  },
}));