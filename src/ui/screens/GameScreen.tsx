// src/ui/screens/GameScreen.tsx
import React from 'react';
import {
  Box, Typography, Button, TextField, Paper, IconButton, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, Alert, Tooltip,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import CasinoIcon from '@mui/icons-material/Casino';
// REMOVE: MenuIcon is not used here; it's in MainLayout.
// import MenuIcon from '@mui/icons-material/Menu';
import { useGameScreenLogic } from '../../utils/hooks/useGameScreenLogic';
import { LogView } from '../components/LogView';
import { PinnedItemsView } from '../components/PinnedItemsView';
// REMOVE: This direct subscription is redundant and causes the errors.
// import { useGameStateStore, selectCurrentGameState } from '../../state/useGameStateStore';

// REMOVE: The onNavToggle prop is no longer needed.
// const GameScreen: React.FC = () => {
const GameScreen: React.FC<{ onNavToggle: () => void }> = () => {

  console.log('%c[GameScreen.tsx] Component rendering.', 'color: darkgreen; font-weight: bold;');

  // ADD `gameState` to the destructuring. This is the state from your logic hook.
  const {
    isReady,
    isLoading,
    isProcessingTurn,
    gameError,
    gameState, // <-- USE THIS
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

  // REMOVE this redundant subscription.
  // const currentGameStateFromStore = useGameStateStore(selectCurrentGameState);

  // The readiness check should be based on what the hook provides.
  console.log(`[GameScreen.tsx] Readiness Check: isReady=${isReady}, isLoading=${isLoading}`);

  if (isLoading) {
    console.log('[GameScreen.tsx] Displaying GameScreen loading state.');
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
        <Typography variant="h6" ml={2}>Loading Game...</Typography>
      </Box>
    );
  }

  // UPDATE: The primary condition should be the isReady flag from the hook.
  if (!isReady) {
    console.log('%c[GameScreen.tsx] Displaying Game Not Initialized state (isReady=false).', 'color: red; font-weight: bold;');
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

  // If we get here, isReady is true, and gameState is guaranteed to be available.
  console.log('[GameScreen.tsx] Displaying full GameScreen UI.');
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', p: 2, position: 'relative' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, flexShrink: 0 }}>
        <Typography variant="h5" component="h1">Narrator</Typography>
        {/* REMOVE: The Nav Toggle button is handled by MainLayout now. */}
      </Box>
      
      <Box sx={{ position: 'relative', zIndex: 10, flexShrink: 0 }}>
        {/* PinnedItemsView now gets its own data from the store. No props are needed. */}
        <PinnedItemsView />
      </Box>

      {/* The rest of the component remains the same */}
      <Paper ref={logContainerRef} elevation={1} sx={{ flexGrow: 1, mt: 1, p: 2, overflowY: 'auto' }}>
        <LogView conversationHistory={conversationHistory} />
      </Paper>

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

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={closeSnackbar}>
        <Alert onClose={closeSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default GameScreen;