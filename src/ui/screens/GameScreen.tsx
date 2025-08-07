// src/ui/screens/GameScreen.tsx
import React from 'react';
import {
  Box, Typography, Button, TextField, Paper, IconButton, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, Alert, Tooltip,
  useTheme, useMediaQuery, InputAdornment,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import CasinoIcon from '@mui/icons-material/Casino';
import { useGameScreenLogic } from '../../utils/hooks/useGameScreenLogic';
import { LogView } from '../components/LogView';
import { PinnedItemsView } from '../components/PinnedItemsView';

const GameScreen: React.FC<{ onNavToggle: () => void }> = () => {
  const {
    isReady,
    isLoading,
    isProcessingTurn,
    gameError,
    // gameState, // REMOVED: No longer directly used in JSX, handled in hook
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
    displayedCurrentNarration,
    fullLatestNarration, // Renamed from latestNarrationFromHook in the hook's return
    enableStreaming,
  } = useGameScreenLogic();

  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const pinnedHeight = isSmallScreen ? theme.spacing(14) : theme.spacing(16); // USED: Now it's used below

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

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'relative',
        overflow: 'hidden',
        px: isSmallScreen ? 1 : 2,
        pt: pinnedHeight, // FIXED: Now using pinnedHeight
      }}
    >
      {/* Floating pinned items */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          backdropFilter: 'blur(8px)',
          backgroundColor: 'rgba(255,255,255,0.1)',
          borderBottom: `1px solid ${theme.palette.divider}`,
          boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
          px: isSmallScreen ? 1 : 2,
          py: isSmallScreen ? 1 : 2,
          pointerEvents: 'none',
        }}
      >
        <PinnedItemsView />
      </Box>

      {/* Scrollable narration area */}
      <Paper
        ref={logContainerRef}
        elevation={1}
        sx={{
          flexGrow: 1,
          overflowY: 'auto',
          p: isSmallScreen ? 1 : 2,
          typography: isSmallScreen ? 'body2' : 'body1',
          backgroundColor: theme.palette.background.paper,
        }}
      >
        <LogView
          conversationHistory={conversationHistory}
          currentStreamingNarration={displayedCurrentNarration}
          isProcessingTurn={isProcessingTurn}
          fullLatestNarration={fullLatestNarration}
          enableStreaming={enableStreaming}
        />
      </Paper>

      {/* Input area */}
      <Box sx={{ position: 'relative', mt: 1 }}>
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
          size={isSmallScreen ? 'small' : 'medium'}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  color="primary"
                  onClick={handleSendAction}
                  disabled={isProcessingTurn || narratorInputText.trim() === ''}
                >
                  {isProcessingTurn ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        {/* Floating dice icon */}
        <Tooltip title="Roll Dice (Right-click to change formula)">
          <IconButton
            color="secondary"
            onClick={handleRollDice}
            onContextMenu={(e) => {
              e.preventDefault();
              handleOpenRollDialog();
            }}
            sx={{
              position: 'absolute',
              right: 60,
              top: -30,
              zIndex: 20,
              backgroundColor: theme.palette.background.paper,
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: 2,
              '&:hover': { backgroundColor: theme.palette.action.hover },
            }}
          >
            <CasinoIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Dice Roll Dialog */}
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

      {/* Snackbar */}
      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={closeSnackbar}>
        <Alert onClose={closeSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default GameScreen;