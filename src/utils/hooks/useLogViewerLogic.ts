// src/utils/hooks/useLogViewerLogic.ts
import { useState, useEffect, useCallback } from 'react';
import { useLogStore } from '../../state/useLogStore';
import { useGameStateStore } from '../../state/useGameStateStore';
import { LogViewMode } from '../../utils/types';

export const useLogViewerLogic = () => {
  // 1. Consume global stores
  const { logEntries, selectedLogViewModes, isLoading, error, setLogEntries, setSelectedLogViewModes } = useLogStore();
  const { currentSnapshot } = useGameStateStore();

  // 2. Local UI state
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const isMenuOpen = Boolean(menuAnchorEl);

  // 3. Data synchronization effect
  useEffect(() => {
    // When the game snapshot changes, update the logs in the log store
    setLogEntries(currentSnapshot?.logs || []);
  }, [currentSnapshot, setLogEntries]);

  // 4. Handlers
  const handleMenuClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    setMenuAnchorEl(event.currentTarget);
  }, []);

  const handleMenuClose = useCallback(() => {
    setMenuAnchorEl(null);
  }, []);

  const handleCheckboxChange = useCallback((mode: LogViewMode) => {
    const newSelection = selectedLogViewModes.includes(mode)
      ? selectedLogViewModes.filter((m) => m !== mode)
      : [...selectedLogViewModes, mode];
    setSelectedLogViewModes(newSelection);
  }, [selectedLogViewModes, setSelectedLogViewModes]);

  // 5. Return Clean API
  return {
    logEntries,
    selectedLogViewModes,
    isLoading,
    error,
    menuAnchorEl,
    isMenuOpen,
    handleMenuClick,
    handleMenuClose,
    handleCheckboxChange,
  };
};