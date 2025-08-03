// src/ui/screens/GameScreen.tsx

import React, { useEffect, useRef } from 'react';
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
import { LogView } from '../components/LogView'; // For chat log
import { PinnedItemsView } from '../components/PinnedItemsView'; // For pinned items
import { GameState, LogEntry, Message } from '../../models/index';
import { DiceRoller } from '../../utils/diceRoller'; // Will need to create this utility

interface GameScreenProps {
  onNavToggle: () => void; // Callback to open/close side menu
}

const GameScreen: React.FC<GameScreenProps> = ({ onNavToggle }) => {
  const { user } = useAuthStore();
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

  const logRef = useRef<HTMLDivElement>(null);

  // Effect to scroll to bottom on new log entries (auto-scroll)
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [gameLogs]); // Depends on gameLogs

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
  }, []); // Only runs on mount/unmount

  // Handle world change message snackbar
  useEffect(() => {
    // This assumes worldChangeMessage would come from GameStateStore or be triggered there
    // For now, let's assume it's directly passed or derived later.
    // If we want a snackbar for world changes, the store needs to provide that string.
    // Example: const worldChangeMsg = useGameStateStore(state => state.worldChangeMessage);
    // if (worldChangeMsg) { setSnackbarMessage(worldChangeMsg); }
  }, []);

  const handleSendAction = async () => {
    if (narratorInputText.trim() === '') return;
    try {
      await processPlayerAction(narratorInputText);
    } catch (e) {
      setSnackbarMessage(`Failed to process action: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };

  const handleRollDice = async () => {
    const result = DiceRoller.roll(rollFormula);
    const summary = DiceRoller.format(result);
    try {
      await processPlayerAction(`Roll: ${rollFormula}\n${summary}`);
    } catch (e) {
      setSnackbarMessage(`Failed to roll dice: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };

  const handleRollDialogConfirm = () => {
    // Validate rollFormula if necessary
    setShowRollDialog(false);
  };

  if (gameLoading && !currentSnapshot) { // Show full screen loading only if no snapshot is loaded yet
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
        <Typography variant="h6" ml={2}>Loading Game...</Typography>
      </Box>
    );
  }

  if (!user || !currentSnapshot || !currentGameState) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="error">Game not initialized or user not logged in.</Typography>
        <Button onClick={() => window.location.reload()}>Go to Login</Button> {/* Simple reload for now */}
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
      <PinnedItemsView gameState={currentGameState} /> {/* Will fetch pinned keys from store internally */}

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
          position: 'relative', // For dice button
        }}
      >
        <LogView logEntries={gameLogs} /> {/* Will render individual turns */}

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
          onContextMenu={(e) => { // Using onContextMenu for right-click/long press
            e.preventDefault();
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
            if (e.key === 'Enter' && !e.shiftKey) { // Send on Enter, new line on Shift+Enter
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
        <Alert onClose={() => setSnackbarMessage(null)} severity={gameError ? "error" : "info"} sx={{ width: '100%' }}>
          {snackbarMessage || gameError}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default GameScreen;