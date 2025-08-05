import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  TextField,
  Paper,
  IconButton,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import CasinoIcon from '@mui/icons-material/Casino';
import MenuIcon from '@mui/icons-material/Menu';
import { useAuthStore } from '../../state/useAuthStore';
import { useGameStateStore } from '../../state/useGameStateStore';
import { LogView } from '../components/LogView';
import { PinnedItemsView } from '../components/PinnedItemsView'; // Ensure this import is correct
import { GameState, LogEntry, Message } from '../../models/index';
import { DiceRoller } from '../../utils/diceRoller';

interface GameScreenProps {
  onNavToggle: () => void;
}

const GameScreen: React.FC<GameScreenProps> = ({ onNavToggle }) => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const {
    currentSnapshot,
    currentGameState,
    conversationHistory,
    narratorInputText,
    narratorScrollPosition,
    gameLoading,
    gameError,
    processPlayerAction,
    updateNarratorInputText,
    processFirstNarratorTurn,
    updateNarratorScrollPosition,
  } = useGameStateStore();

  const [showRollDialog, setShowRollDialog] = React.useState(false);
  const [rollFormula, setRollFormula] = React.useState("2d6");
  const [snackbarMessage, setSnackbarMessage] = React.useState<string | null>(null);
  const [snackbarSeverity, setSnackbarSeverity] = React.useState<'success' | 'error' | 'info' | 'warning'>('info');

  const logRef = useRef<HTMLDivElement>(null);
  const initialTurnTriggeredForSnapshot = useRef<string | null>(null);

  const handleGoToLogin = () => {
    console.log('GameScreen: Navigating to /login due to game not initialized or user not logged in.');
    navigate('/login');
  };

  if (!user || !currentSnapshot || !currentGameState) {
    console.warn('GameScreen: Displaying "Game not initialized" message because:', {
      userExists: !!user,
      snapshotExists: !!currentSnapshot,
      gameStateExists: !!currentGameState,
      errorMessage: gameError
    });

    if (gameLoading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <CircularProgress />
          <Typography variant="h6" ml={2}>Loading Game...</Typography>
        </Box>
      );
    }

    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="error">Game not initialized or user not logged in.</Typography>
        <Button onClick={handleGoToLogin}>Go to Login</Button>
      </Box>
    );
  }

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [conversationHistory]);

  useEffect(() => {
    if (!currentSnapshot) return;
    if (
      initialTurnTriggeredForSnapshot.current !== currentSnapshot.id &&
      currentSnapshot.currentTurn === 0 &&
      // CHANGED THIS LINE
      currentSnapshot.conversationHistory?.length === 1 && // Trigger AI when initial narrative is present
      !gameLoading
    ) {
      initialTurnTriggeredForSnapshot.current = currentSnapshot.id;
      console.log("GameScreen: Detected start of Turn 0. Triggering narrator's first response.");
      processFirstNarratorTurn();
    }
  }, [currentSnapshot, gameLoading, processFirstNarratorTurn]);

  useEffect(() => {
    if (logRef.current && narratorScrollPosition !== undefined) {
      logRef.current.scrollTop = narratorScrollPosition;
    }
    return () => {
      if (logRef.current) {
        updateNarratorScrollPosition(logRef.current.scrollTop);
      }
    };
  }, []);

  const handleSendAction = async () => {
    if (narratorInputText.trim() === '') return;
    try {
      await processPlayerAction(narratorInputText);
      setSnackbarSeverity('success');
      setSnackbarMessage('Action sent!');
    } catch (e) {
      setSnackbarSeverity('error');
      setSnackbarMessage(`Failed to process action: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };

  const handleRollDice = async () => {
    try {
      const result = DiceRoller.roll(rollFormula);
      const summary = DiceRoller.format(result);
      await processPlayerAction(`Roll: ${rollFormula}\n${summary}`);
      setSnackbarSeverity('success');
      setSnackbarMessage(`Rolled ${rollFormula}: ${summary}`);
    } catch (e) {
      setSnackbarSeverity('error');
      setSnackbarMessage(`Failed to roll dice: ${e instanceof Error ? e.message : 'Invalid formula or error'}`);
    }
  };

  const handleRollDialogConfirm = () => {
    if (!rollFormula.match(/^(\d*)d(\d+)([\+\-]\d+)?$/i)) {
        setSnackbarSeverity('warning');
        setSnackbarMessage('Invalid dice formula format. Please use NdN[+M|-M].');
        return;
    }
    setShowRollDialog(false);
  };

  // Estimate the height of the PinnedItemsView to set the paddingTop for the log view.
  // This might require some trial and error or a more dynamic calculation if the content varies wildly.
  // Let's assume a fixed height for now for demonstration.
  const estimatedPinnedItemsHeight = '120px'; // Re-evaluate and adjust this value as needed.
                                              // It depends on the height of your PinnedEntityGroup components.
                                              // If you have multiple rows of pinned items, this needs to be larger.

  return (
    // Main container Box needs position: relative to anchor absolute children
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', p: 2, position: 'relative' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" component="h1">
          Narrator
        </Typography>
        <IconButton onClick={onNavToggle} aria-label="menu" sx={{ ml: 'auto' }}>
          <MenuIcon />
        </IconButton>
      </Box>

      {/* Pinned Items Section - Will be absolutely positioned and float */}
      {/* This Box now directly positions the Stack from PinnedItemsView */}
      <Box sx={{
          position: 'absolute', // Position it absolutely
          top: '60px', // Adjust this value to position it below the header
          left: '16px', // Align with main padding
          right: '16px', // Align with main padding
          zIndex: 10, // Ensure it's above the log view
          // The PinnedItemsView's internal Stack now handles its own overflowX
          // No background needed here, as the tiles themselves have backgrounds.
      }}>
        <PinnedItemsView gameState={currentGameState} />
      </Box>

      {/* Log/Chat View */}
      {/* Add padding to the top of the log view to make space for the floating pinned items */}
      <Paper
        ref={logRef}
        elevation={1}
        sx={{
          flexGrow: 1,
          mt: 2, // You can likely remove or reduce this mt if the paddingTop covers the spacing.
                // Leaving it for now, but test to see if it causes too much space.
          p: 2,
          overflowY: 'auto',
          backgroundColor: (theme) => theme.palette.background.paper,
          // This padding ensures content doesn't get hidden under the absolutely positioned pinned items
          paddingTop: `calc(${estimatedPinnedItemsHeight} + 1em)`, // Use estimated height + buffer
          boxSizing: 'border-box', // Ensure padding is included in the element's total height and width
        }}
      >
        <LogView conversationHistory={conversationHistory} />
      </Paper>

      {/* Input Field Section (remains the same) */}
      <Box sx={{ display: 'flex', mt: 2, gap: 1, position: 'relative' }}>
        <TextField
          fullWidth
          multiline
          maxRows={4}
          variant="outlined"
          placeholder="What do you do?"
          value={narratorInputText}
          onChange={(e) => updateNarratorInputText(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendAction();
            }
          }}
          sx={{ flexGrow: 1 }}
        />
        <Button
          variant="contained"
          onClick={handleSendAction}
          endIcon={<SendIcon />}
          disabled={gameLoading || narratorInputText.trim() === ''}
        >
          {gameLoading ? <CircularProgress size={24} color="inherit" /> : 'Send'}
        </Button>

        {/* Dice Roller Button (Absolutely Positioned Overlay - remains the same) */}
        <IconButton
          sx={{
            position: 'absolute',
            bottom: 'calc(100% - 30px)',
            right: '10px',
            transform: 'translateY(-100%)',
            backgroundColor: (theme) => theme.palette.primary.light,
            color: (theme) => theme.palette.primary.contrastText,
            '&:hover': {
              backgroundColor: (theme) => theme.palette.primary.main,
            },
            zIndex: 10,
          }}
          onClick={handleRollDice}
          onContextMenu={(e) => {
            e.preventDefault();
            setShowRollDialog(true);
          }}
          aria-label="roll dice"
        >
          <CasinoIcon />
        </IconButton>
      </Box>

      {/* ... (Dice Roll Dialog and Snackbar remain the same) ... */}
    </Box>
  );
};

export default GameScreen;