// src/ui/screens/GameScreen.tsx

import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom'; // Import useNavigate hook
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
import { PinnedItemsView } from '../components/PinnedItemsView';
import { GameState, LogEntry, Message } from '../../models/index';
import { DiceRoller } from '../../utils/diceRoller';

interface GameScreenProps {
  onNavToggle: () => void; // Callback to open/close side menu
}

const GameScreen: React.FC<GameScreenProps> = ({ onNavToggle }) => {
  const { user } = useAuthStore();
  const navigate = useNavigate(); // Initialize useNavigate
  const {
    currentSnapshot,
    currentGameState,
    gameLogs,
    narratorInputText,
    narratorScrollPosition,
    gameLoading,
    gameError,
    processPlayerAction,
    updateNarratorInputText,
    updateNarratorScrollPosition,
  } = useGameStateStore();

  const [showRollDialog, setShowRollDialog] = React.useState(false);
  const [rollFormula, setRollFormula] = React.useState("2d6");
  const [snackbarMessage, setSnackbarMessage] = React.useState<string | null>(null);
  const [snackbarSeverity, setSnackbarSeverity] = React.useState<'success' | 'error' | 'info' | 'warning'>('info');


  const logRef = useRef<HTMLDivElement>(null);

  // Effect to scroll to bottom on new log entries (auto-scroll)
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [gameLogs]);

  // Effect to restore scroll position from store (on component mount/unmount)
  useEffect(() => {
    if (logRef.current && narratorScrollPosition !== undefined) {
      logRef.current.scrollTop = narratorScrollPosition;
    }
    // Cleanup: save scroll position when component unmounts or rerenders significantly
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
    // Basic validation for dice formula
    if (!rollFormula.match(/^(\d*)d(\d+)([\+\-]\d+)?$/i)) {
        setSnackbarSeverity('warning');
        setSnackbarMessage('Invalid dice formula format. Please use NdN[+M|-M].');
        return;
    }
    setShowRollDialog(false);
  };

  // Correct navigation to LoginScreen
  const handleGoToLogin = () => {
    navigate('/login');
  };

  if (gameLoading && !currentSnapshot) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
        <Typography variant="h6" ml={2}>Loading Game...</Typography>
      </Box>
    );
  }

  // Changed to check for `user` first for proper redirection from App.tsx.
  // This screen only truly renders its content if user and snapshot are present.
  if (!user || !currentSnapshot || !currentGameState) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="error">Game not initialized or user not logged in.</Typography>
        <Button onClick={handleGoToLogin}>Go to Login</Button> {/* Corrected navigation */}
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', p: 2 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" component="h1">
          Narrator
        </Typography>
        <IconButton onClick={onNavToggle} aria-label="menu">
          <MenuIcon />
        </IconButton>
      </Box>

      {/* Pinned Items Section */}
      <PinnedItemsView gameState={currentGameState} />

      {/* Log/Chat View */}
      <Paper
        ref={logRef}
        elevation={1}
        sx={{
          flexGrow: 1,
          mt: 2,
          p: 2,
          overflowY: 'auto',
          backgroundColor: (theme) => theme.palette.background.paper,
          position: 'relative',
        }}
      >
        <LogView logEntries={gameLogs} />

        {/* Dice Roller Button (Floating) */}
        <IconButton
          sx={{
            position: 'absolute',
            bottom: 16,
            right: 16,
            backgroundColor: (theme) => theme.palette.primary.light,
            color: (theme) => theme.palette.primary.contrastText,
            '&:hover': {
              backgroundColor: (theme) => theme.palette.primary.main,
            },
          }}
          onClick={handleRollDice}
          onContextMenu={(e) => {
            e.preventDefault(); // Prevent native context menu
            setShowRollDialog(true);
          }}
          aria-label="roll dice"
        >
          <CasinoIcon />
        </IconButton>
      </Paper>

      {/* Input Field */}
      <Box sx={{ display: 'flex', mt: 2, gap: 1 }}>
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
      </Box>

      {/* Dice Roll Dialog */}
      <Dialog open={showRollDialog} onClose={() => setShowRollDialog(false)}>
        <DialogTitle>Set Dice Formula</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Dice Formula"
            type="text"
            fullWidth
            variant="outlined"
            value={rollFormula}
            onChange={(e) => setRollFormula(e.target.value)}
            placeholder="e.g. 1d20+3 or 3d6"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowRollDialog(false)}>Cancel</Button>
          <Button onClick={handleRollDialogConfirm}>Set</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for error/info messages */}
      <Snackbar
        open={!!snackbarMessage}
        autoHideDuration={6000}
        onClose={() => setSnackbarMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbarMessage(null)} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage || gameError}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default GameScreen;