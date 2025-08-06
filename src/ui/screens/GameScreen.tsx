// src/ui/screens/GameScreen.tsx
import React from 'react';
import {
  Box, Typography, Button, TextField, Paper, IconButton, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, Alert, Tooltip,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import CasinoIcon from '@mui/icons-material/Casino';
import MenuIcon from '@mui/icons-material/Menu';
import { useGameScreenLogic } from '../../utils/hooks/useGameScreenLogic';
import { LogView } from '../components/LogView';
import { PinnedItemsView } from '../components/PinnedItemsView';

interface GameScreenProps {
  onNavToggle: () => void;
}

const GameScreen: React.FC<GameScreenProps> = ({ onNavToggle }) => {
  const {
    isReady,
    isLoading,
    isProcessingTurn,
    gameError,
    gameState,
    conversationHistory,
    narratorInputText,
    logContainerRef,
    snackbar,
    rollDialog,
    handleGoToLogin,
    handleSendAction,
    handleInputChange,
    handleKeyPress,
    handleRollDice,
    handleOpenRollDialog,
    handleCloseRollDialog,
    handleRollFormulaChange,
    closeSnackbar,
  } = useGameScreenLogic();

  // --- Render Logic ---

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
        <Typography variant="h6" ml={2}>Loading Game...</Typography>
      </Box>
    );
  }

  if (!isReady) {
    return (
      <Box sx={{ p: 3, textAlign: 'center', mt: 4 }}>
        <Typography variant="h6" color="error">Game Not Initialized</Typography>
        <Typography variant="body1" sx={{ my: 2 }}>
          There is no active game session. Please start a new game from the library.
        </Typography>
        <Button variant="contained" onClick={handleGoToLogin}>Go to Game Library</Button>
        {gameError && <Alert severity="error" sx={{ mt: 2 }}>{gameError}</Alert>}
      </Box>
    );
  }

  // The main game UI is rendered here, now that we know we are `isReady`
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', p: 2, position: 'relative' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, flexShrink: 0 }}>
        <Typography variant="h5" component="h1">Narrator</Typography>
        <IconButton onClick={onNavToggle} aria-label="menu"><MenuIcon /></IconButton>
      </Box>

      {/* Pinned Items View floats on top */}
      <Box sx={{ position: 'relative', zIndex: 10, flexShrink: 0 }}>
        <PinnedItemsView gameState={gameState} />
      </Box>

      {/* Log/Chat View */}
      <Paper ref={logContainerRef} elevation={1} sx={{ flexGrow: 1, mt: 1, p: 2, overflowY: 'auto' }}>
        <LogView conversationHistory={conversationHistory} />
      </Paper>

      {/* Input Field Section */}
      <Box sx={{ display: 'flex', mt: 2, gap: 1, flexShrink: 0 }}>
        <TextField
          fullWidth
          multiline
          maxRows={4}
          variant="outlined"
          placeholder="What do you do?"
          value={narratorInputText}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isProcessingTurn}
        />
        <Button
          variant="contained"
          onClick={handleSendAction}
          endIcon={<SendIcon />}
          disabled={isProcessingTurn || narratorInputText.trim() === ''}
          sx={{ height: 'fit-content', alignSelf: 'flex-end' }}
        >
          {isProcessingTurn ? <CircularProgress size={24} color="inherit" /> : 'Send'}
        </Button>
        <Tooltip title="Roll Dice (Right-click to change formula)">
          <IconButton
            color="primary"
            onClick={handleRollDice}
            onContextMenu={(e) => { e.preventDefault(); handleOpenRollDialog(); }}
            aria-label="roll dice"
            sx={{ height: 'fit-content', alignSelf: 'flex-end' }}
          >
            <CasinoIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Dice Roller Dialog */}
      <Dialog open={rollDialog.open} onClose={handleCloseRollDialog}>
        <DialogTitle>Dice Roll</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Dice Formula"
            type="text"
            fullWidth
            variant="standard"
            value={rollDialog.formula}
            onChange={(e) => handleRollFormulaChange(e.target.value)}
            helperText="e.g., 2d6, 1d20+5, 3d8-2"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseRollDialog}>Cancel</Button>
          <Button onClick={handleRollDice}>Roll & Send</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for feedback */}
      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={closeSnackbar}>
        <Alert onClose={closeSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default GameScreen;