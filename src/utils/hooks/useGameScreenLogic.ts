// src/utils/hooks/useGameScreenLogic.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../state/useAuthStore';
import { useGameStateStore } from '../../state/useGameStateStore';
import { DiceRoller } from '../../utils/diceRoller';
import type { GameState } from '../../models';

export const useGameScreenLogic = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // 1. Consume the global state stores
  const {
    currentSnapshot,
    currentGameState,
    conversationHistory,
    narratorInputText,
    gameLoading,
    isProcessingTurn,
    gameError,
    processPlayerAction,
    updateNarratorInputText,
    processFirstNarratorTurn,
  } = useGameStateStore();

  // 2. All local UI state is moved here
  const [showRollDialog, setShowRollDialog] = useState(false);
  const [rollFormula, setRollFormula] = useState("2d6");
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }>({ open: false, message: '', severity: 'info' });

  // 3. All refs are moved here
  const logContainerRef = useRef<HTMLDivElement>(null);
  const initialTurnTriggeredForSnapshot = useRef<string | null>(null);

  // 4. All useEffects are moved here
  useEffect(() => {
    // Auto-scroll to the bottom of the log on new messages
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [conversationHistory]);

  useEffect(() => {
    // This effect intelligently triggers the AI's first turn response only once
    // when a new game is started (turn 0).
    if (!currentSnapshot || gameLoading) return;

    const needsFirstTurn =
      currentSnapshot.currentTurn === 0 &&
      currentSnapshot.conversationHistory?.length === 1 &&
      initialTurnTriggeredForSnapshot.current !== currentSnapshot.id;

    if (needsFirstTurn) {
      initialTurnTriggeredForSnapshot.current = currentSnapshot.id;
      console.log("GameScreenLogic: Detected start of Turn 0. Triggering narrator's first response.");
      processFirstNarratorTurn();
    }
  }, [currentSnapshot, gameLoading, processFirstNarratorTurn]);

  // 5. All handler functions are moved here and wrapped in useCallback
  const showSnackbar = useCallback((message: string, severity: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const handleSendAction = useCallback(async () => {
    if (narratorInputText.trim() === '' || isProcessingTurn) return;
    try {
      await processPlayerAction(narratorInputText);
      // Success message is optional, as the UI updates with the AI response
    } catch (e) {
      showSnackbar(`Failed to process action: ${e instanceof Error ? e.message : 'Unknown error'}`, 'error');
    }
  }, [narratorInputText, isProcessingTurn, processPlayerAction, showSnackbar]);

  const handleRollDice = useCallback(async () => {
    try {
      const result = DiceRoller.roll(rollFormula);
      const summary = DiceRoller.format(result);
      await processPlayerAction(`I roll the dice (${rollFormula}) and get the following result:\n${summary}`);
      showSnackbar(`Rolled ${rollFormula}: ${summary}`, 'success');
      setShowRollDialog(false);
    } catch (e) {
      showSnackbar(`Failed to roll dice: ${e instanceof Error ? e.message : 'Invalid formula'}`, 'error');
    }
  }, [rollFormula, processPlayerAction, showSnackbar]);

  const handleOpenRollDialog = useCallback(() => {
      setShowRollDialog(true);
  }, []);

  const handleKeyPress = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendAction();
    }
  }, [handleSendAction]);

  const closeSnackbar = useCallback(() => {
    setSnackbar(prev => ({ ...prev, open: false }));
  }, []);

  // 6. Return a clean API for the component
  return {
    // State and Data for Rendering
    isReady: !!user && !!currentSnapshot && !!currentGameState,
    isLoading: gameLoading,
    isProcessingTurn,
    gameError,
    gameState: currentGameState as GameState, // Assert non-null for the component
    conversationHistory,
    narratorInputText,
    logContainerRef,
    snackbar,

    // Dialog State
    rollDialog: {
      open: showRollDialog,
      formula: rollFormula,
    },

    // Handlers for UI Events
    handleGoToLogin: () => navigate('/login'),
    handleSendAction,
    handleInputChange: updateNarratorInputText,
    handleKeyPress,
    handleRollDice,
    handleOpenRollDialog,
    handleCloseRollDialog: () => setShowRollDialog(false),
    handleRollFormulaChange: setRollFormula,
    closeSnackbar,
  };
};