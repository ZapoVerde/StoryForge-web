// src/utils/hooks/useGameScreenLogic.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../state/useAuthStore';
import { useGameStateStore, selectCurrentGameState, selectConversationHistory } from '../../state/useGameStateStore'; // Import selectors
import { DiceRoller } from '../../utils/diceRoller';
import type { GameState } from '../../models';

export const useGameScreenLogic = () => {
  console.log('[useGameScreenLogic.ts] Hook execution started.');

  const navigate = useNavigate();
  const { user } = useAuthStore();

  // 1. Consume the global state stores using selectors for stability
  const currentSnapshot = useGameStateStore(state => state.currentSnapshot);
  const currentGameState = useGameStateStore(selectCurrentGameState); // Use selector
  const conversationHistory = useGameStateStore(selectConversationHistory); // Use selector
  const narratorInputText = useGameStateStore(state => state.narratorInputText);
  const gameLoading = useGameStateStore(state => state.gameLoading);
  const isProcessingTurn = useGameStateStore(state => state.isProcessingTurn);
  const gameError = useGameStateStore(state => state.gameError);

  // Get actions directly from the store's current state (stable references)
  const processPlayerAction = useGameStateStore(state => state.processPlayerAction);
  const updateNarratorInputText = useGameStateStore(state => state.updateNarratorInputText);
  const processFirstNarratorTurn = useGameStateStore(state => state.processFirstNarratorTurn);


  // 2. All local UI state is moved here
  const [showRollDialog, setShowRollDialog] = useState(false);
  const [rollFormula, setRollFormula] = useState("2d6");
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }>({ open: false, message: '', severity: 'info' });

  // 3. All refs are moved here
  const logContainerRef = useRef<HTMLDivElement>(null);
  // This ref ensures processFirstNarratorTurn is only called once per snapshot ID
  const initialTurnTriggeredForSnapshot = useRef<string | null>(null);

  // 4. All useEffects are moved here
  useEffect(() => {
    console.log(`[useGameScreenLogic.ts] useEffect (auto-scroll): conversationHistory changed. Count: ${conversationHistory.length}`);
    // Auto-scroll to the bottom of the log on new messages
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [conversationHistory]);

  useEffect(() => {
    console.log(`%c[useGameScreenLogic.ts] useEffect (first turn check) triggered. Snapshot ID: ${currentSnapshot?.id || 'null'}, gameLoading: ${gameLoading}, currentTurn: ${currentSnapshot?.currentTurn}.`, 'color: grey;');

    if (!currentSnapshot || gameLoading) {
      console.log('[useGameScreenLogic.ts] First turn check: Skipping (no snapshot or still loading).');
      return;
    }

    const needsFirstTurn =
      currentSnapshot.currentTurn === 0 &&
      currentSnapshot.conversationHistory?.length === 1 && // Only the initial narrator prose
      initialTurnTriggeredForSnapshot.current !== currentSnapshot.id; // Not yet triggered for THIS snapshot

    if (needsFirstTurn) {
      initialTurnTriggeredForSnapshot.current = currentSnapshot.id;
      console.log(`%c[useGameScreenLogic.ts] First turn check: Detected start of Turn 0. Triggering narrator's first response for snapshot ${currentSnapshot.id}.`, 'color: #8B008B; font-weight: bold;');
      processFirstNarratorTurn();
    } else {
        console.log('[useGameScreenLogic.ts] First turn check: No first turn needed or already triggered.');
    }
  }, [currentSnapshot, gameLoading, processFirstNarratorTurn]);

  // 5. All handler functions are moved here and wrapped in useCallback
  const showSnackbar = useCallback((message: string, severity: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    console.log(`[useGameScreenLogic.ts] showSnackbar: Message: "${message}", Severity: ${severity}`);
    setSnackbar({ open: true, message, severity });
  }, []);

  const handleSendAction = useCallback(async () => {
    console.log(`[useGameScreenLogic.ts] handleSendAction: Input: "${narratorInputText.substring(0, 50)}...". IsProcessing: ${isProcessingTurn}`);
    if (narratorInputText.trim() === '' || isProcessingTurn) {
        console.warn('[useGameScreenLogic.ts] handleSendAction: Skipping due to empty input or already processing.');
        return;
    }
    try {
      await processPlayerAction(narratorInputText);
      console.log('[useGameScreenLogic.ts] handleSendAction: processPlayerAction completed.');
    } catch (e) {
      console.error('[useGameScreenLogic.ts] handleSendAction: Error processing action:', e);
      showSnackbar(`Failed to process action: ${e instanceof Error ? e.message : 'Unknown error'}`, 'error');
    }
  }, [narratorInputText, isProcessingTurn, processPlayerAction, showSnackbar]);

  const handleRollDice = useCallback(async () => {
    console.log(`[useGameScreenLogic.ts] handleRollDice: Rolling with formula: ${rollFormula}`);
    try {
      const result = DiceRoller.roll(rollFormula);
      const summary = DiceRoller.format(result);
      console.log(`[useGameScreenLogic.ts] handleRollDice: Roll result: ${summary}`);
      await processPlayerAction(`I roll the dice (${rollFormula}) and get the following result:\n${summary}`);
      showSnackbar(`Rolled ${rollFormula}: ${summary}`, 'success');
      setShowRollDialog(false);
    } catch (e) {
      console.error('[useGameScreenLogic.ts] handleRollDice: Error rolling dice:', e);
      showSnackbar(`Failed to roll dice: ${e instanceof Error ? e.message : 'Invalid formula'}`, 'error');
    }
  }, [rollFormula, processPlayerAction, showSnackbar]);

  const handleOpenRollDialog = useCallback(() => {
      console.log('[useGameScreenLogic.ts] handleOpenRollDialog: Opening roll dialog.');
      setShowRollDialog(true);
  }, []);

  const handleKeyPress = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      console.log('[useGameScreenLogic.ts] handleKeyPress: Enter pressed, calling handleSendAction.');
      event.preventDefault();
      handleSendAction();
    }
  }, [handleSendAction]);

  const closeSnackbar = useCallback(() => {
    console.log('[useGameScreenLogic.ts] closeSnackbar: Closing snackbar.');
    setSnackbar(prev => ({ ...prev, open: false }));
  }, []);

  // 6. Return a clean API for the component
  return {
    // State and Data for Rendering
    isReady: !!user && !!currentSnapshot && !!currentGameState, // Ensure currentGameState is actually an object
    isLoading: gameLoading, // Use gameLoading from store
    isProcessingTurn,
    gameError,
    gameState: currentGameState as GameState, // Assert non-null for the component's direct use
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
    handleGoToLogin: () => {
      console.log('[useGameScreenLogic.ts] handleGoToLogin: Navigating to /login.');
      navigate('/login');
    },
    handleSendAction,
    handleInputChange: updateNarratorInputText, // Direct use of store action
    handleKeyPress,
    handleRollDice,
    handleOpenRollDialog,
    handleCloseRollDialog: () => {
      console.log('[useGameScreenLogic.ts] handleCloseRollDialog: Closing roll dialog.');
      setShowRollDialog(false);
    },
    handleRollFormulaChange: setRollFormula,
    closeSnackbar,
  };
};