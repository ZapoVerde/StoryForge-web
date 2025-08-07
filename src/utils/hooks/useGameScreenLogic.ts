import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../state/useAuthStore';
import { useGameStateStore, selectCurrentGameState, selectConversationHistory } from '../../state/useGameStateStore';
import { DiceRoller } from '../../utils/diceRoller';
import { usePromptCardStore } from '../../state/usePromptCardStore';
import { useSettingsStore } from '../../state/useSettingsStore';
import { debugLog, errorLog } from '../../utils/debug';

export const useGameScreenLogic = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const enableDebugLogging = useSettingsStore(state => state.enableDebugLogging);
  const typingSpeedMs = useSettingsStore(state => state.textGenerationSpeedMs);

  const currentSnapshot = useGameStateStore(state => state.currentSnapshot);
  const currentGameState = useGameStateStore(selectCurrentGameState);
  const conversationHistory = useGameStateStore(selectConversationHistory);
  const narratorInputText = useGameStateStore(state => state.narratorInputText);
  const gameLoading = useGameStateStore(state => state.gameLoading);
  const isProcessingTurn = useGameStateStore(state => state.isProcessingTurn);
  const gameError = useGameStateStore(state => state.gameError);
  const activePromptCard = usePromptCardStore(state => state.activePromptCard);

  const processPlayerAction = useGameStateStore(state => state.processPlayerAction);
  const updateNarratorInputText = useGameStateStore(state => state.updateNarratorInputText); // Keep this one for the input text field

  const [showRollDialog, setShowRollDialog] = useState(false);
  const [rollFormula, setRollFormula] = useState("2d6");
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info', // Initial value (no change needed here)
  });

  const [displayedCurrentNarration, setDisplayedCurrentNarration] = useState('');

  const logContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isFirstPlayerAction = currentSnapshot?.conversationHistory?.length === 1;

  useEffect(() => {
    if (enableDebugLogging) {
      debugLog(`[useGameScreenLogic.ts] useEffect (auto-scroll): conversationHistory changed. Count: ${conversationHistory.length}`);
    }
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [conversationHistory, enableDebugLogging, displayedCurrentNarration]);

  useEffect(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    const fullNarration = currentGameState?.narration || '';
    const enableStreaming = activePromptCard?.aiSettings?.streaming ?? true;

    const shouldTypeOut = enableStreaming && fullNarration.length > 0 && !isProcessingTurn;
    const shouldAnimateFirstTurn = isFirstPlayerAction && shouldTypeOut;

    if (shouldAnimateFirstTurn) {
      setDisplayedCurrentNarration('');
      let i = 0;
      const typeCharacter = () => {
        if (i < fullNarration.length) {
          setDisplayedCurrentNarration((prev) => prev + fullNarration.charAt(i));
          i++;
          typingTimeoutRef.current = setTimeout(typeCharacter, typingSpeedMs);
        } else {
          typingTimeoutRef.current = null;
        }
      };
      typingTimeoutRef.current = setTimeout(typeCharacter, typingSpeedMs);
    } else {
      setDisplayedCurrentNarration(fullNarration);
    }

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [
    currentGameState?.narration,
    activePromptCard?.aiSettings?.streaming,
    isProcessingTurn,
    typingSpeedMs,
    isFirstPlayerAction,
  ]);

  const showSnackbar = useCallback((message: string, severity: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    if (enableDebugLogging) debugLog(`[useGameScreenLogic.ts] Snackbar: "${message}" (${severity})`);
    setSnackbar({ open: true, message, severity });
  }, [enableDebugLogging]);

  const handleSendAction = useCallback(async () => {
    if (enableDebugLogging) debugLog(`[useGameScreenLogic.ts] handleSendAction: Input: "${narratorInputText}"`);
    if (narratorInputText.trim() === '' || isProcessingTurn) {
      if (enableDebugLogging) debugLog('[useGameScreenLogic.ts] Skipping send — empty or already processing.');
      return;
    }
    try {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      setDisplayedCurrentNarration(currentGameState?.narration || '');
      await processPlayerAction(narratorInputText);
      if (enableDebugLogging) debugLog('[useGameScreenLogic.ts] processPlayerAction completed.');
    } catch (e) {
      errorLog('[useGameScreenLogic.ts] Error in handleSendAction:', e);
      showSnackbar(`Failed to process action: ${e instanceof Error ? e.message : 'Unknown error'}`, 'error');
    }
  }, [narratorInputText, isProcessingTurn, processPlayerAction, showSnackbar, currentGameState?.narration, enableDebugLogging]);

  const handleRollDice = useCallback(async () => {
    if (enableDebugLogging) debugLog(`[useGameScreenLogic.ts] Rolling formula: ${rollFormula}`);
    try {
      const result = DiceRoller.roll(rollFormula);
      const summary = DiceRoller.format(result);
      if (enableDebugLogging) debugLog(`[useGameScreenLogic.ts] Dice result: ${summary}`);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      setDisplayedCurrentNarration(currentGameState?.narration || '');

      await processPlayerAction(`I roll the dice (${rollFormula}) and get the following result:\n${summary}`);
      showSnackbar(`Rolled ${rollFormula}: ${summary}`, 'success');
      setShowRollDialog(false);
    } catch (e) {
      errorLog('[useGameScreenLogic.ts] Error in handleRollDice:', e);
      showSnackbar(`Failed to roll dice: ${e instanceof Error ? e.message : 'Invalid formula'}`, 'error');
    }
  }, [rollFormula, processPlayerAction, showSnackbar, currentGameState?.narration, enableDebugLogging]);

  const handleOpenRollDialog = useCallback(() => {
    if (enableDebugLogging) debugLog('[useGameScreenLogic.ts] Opening roll dialog.');
    setShowRollDialog(true);
  }, [enableDebugLogging]);

  const handleKeyPress = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      if (enableDebugLogging) debugLog('[useGameScreenLogic.ts] Enter pressed — sending action.');
      event.preventDefault();
      handleSendAction();
    }
  }, [handleSendAction, enableDebugLogging]);

  const closeSnackbar = useCallback(() => {
    if (enableDebugLogging) debugLog('[useGameScreenLogic.ts] Closing snackbar.');
    setSnackbar(prev => ({ ...prev, open: false }));
  }, [enableDebugLogging]);

  return {
    isReady: !!user && !!currentSnapshot && !!currentGameState,
    isLoading: gameLoading,
    isProcessingTurn,
    gameError,
    conversationHistory,
    narratorInputText,
    logContainerRef,
    snackbar,
    displayedCurrentNarration,
    fullLatestNarration: currentGameState?.narration || '',
    enableStreaming: activePromptCard?.aiSettings?.streaming ?? true,

    rollDialog: {
      open: showRollDialog,
      formula: rollFormula,
    },

    handleGoToLogin: () => {
      if (enableDebugLogging) debugLog('[useGameScreenLogic.ts] Navigating to /login');
      navigate('/login');
    },
    handleSendAction,
    handleInputChange: updateNarratorInputText,
    handleKeyPress,
    handleRollDice,
    handleOpenRollDialog,
    handleCloseRollDialog: () => {
      if (enableDebugLogging) debugLog('[useGameScreenLogic.ts] Closing roll dialog.');
      setShowRollDialog(false);
    },
    handleRollFormulaChange: setRollFormula,
    closeSnackbar,
  };
};
