// src/ui/screens/GameScreen.tsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Paper, Typography, TextField, IconButton, Stack, Divider,
  CircularProgress, Button, Fab,
  Dialog, DialogActions, DialogContent, DialogTitle,
  Snackbar, Alert
} from '@mui/material';

import type {AlertColor} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import CasinoIcon from '@mui/icons-material/Casino';

import { useGameStateStore, selectConversationHistory } from '../../state/useGameStateStore';
import { usePromptCardStore } from '../../state/usePromptCardStore';
import { PinnedItemsView } from '../components/PinnedItemsView';
import { DiceRoller } from '../../utils/diceRoller';
import { useLongPress } from '../../utils/hooks/useLongPress';

export const GameScreen: React.FC = () => {
  const {
    gameLoading,
    currentSnapshot,
    isProcessingTurn,
    processTurn
  } = useGameStateStore();

  const conversationHistory = useGameStateStore(selectConversationHistory);
  const activePromptCard = usePromptCardStore((state) => state.activePromptCard);

  const [userInput, setUserInput] = useState('');
  const logEndRef = useRef<HTMLDivElement>(null);

  const [isRollDialogOpen, setIsRollDialogOpen] = useState(false);
  const [rollFormula, setRollFormula] = useState('1d20');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' as AlertColor });

  const showSnackbar = (message: string, severity: AlertColor = 'info') => {
    setSnackbar({ open: true, message, severity });
  };
  const closeSnackbar = () => setSnackbar(prev => ({ ...prev, open: false }));

  const handleQuickRoll = useCallback(async () => {
    if (isProcessingTurn) return;
    try {
      const result = DiceRoller.roll(rollFormula);
      const summary = DiceRoller.format(result);
      const actionString = `(The player quickly rolls ${rollFormula}. Result: ${summary})`;
      await processTurn(actionString);
      showSnackbar(`Rolled ${rollFormula}: ${summary}`, 'success');
    } catch (e) {
      showSnackbar("Invalid dice formula. Long-press the dice icon to fix it.", 'error');
    }
  }, [rollFormula, isProcessingTurn, processTurn]);

  const handleOpenRollDialog = () => setIsRollDialogOpen(true);
  const handleCloseRollDialog = () => setIsRollDialogOpen(false);
  
  const handleRollFromDialog = useCallback(async () => {
    await handleQuickRoll();
    handleCloseRollDialog();
  }, [handleQuickRoll]);
  
  const longPressProps = useLongPress(
    handleOpenRollDialog,
    handleQuickRoll,
    { delay: 400 }
  );

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationHistory]);

  const handleSubmit = useCallback(async () => {
    if (!userInput.trim() || isProcessingTurn) return;
    await processTurn(userInput);
    setUserInput('');
  }, [userInput, isProcessingTurn, processTurn]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  if (gameLoading || !activePromptCard) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
        <Typography variant="h6" ml={2}>Loading Game...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '100%', p: 2 }}>
      <PinnedItemsView />
      <Divider sx={{ my: 1 }} />
      <Box sx={{ flex: 1, overflowY: 'auto', px: 1, pb: 8 }}>
        {conversationHistory.map((msg, index) => (
          <Paper key={index} elevation={0} sx={{ p: 1.5, mb: 1.5, backgroundColor: 'transparent' }}>
            {/* THEME USAGE: Using 'primary.main' and 'secondary.main' from your theme for text colors */}
            <Typography variant="body2" sx={{ fontWeight: 'bold', color: msg.role === 'user' ? 'primary.main' : 'secondary.main' }}>
              {msg.role === 'user' ? 'You' : 'Narrator'}
            </Typography>
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
              {msg.content}
            </Typography>
          </Paper>
        ))}
        {isProcessingTurn && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <CircularProgress size={30} />
          </Box>
        )}
        <div ref={logEndRef} />
      </Box>

      <Fab
        // THEME USAGE: 'color="secondary"' pulls BRAND_PRIMARY_DARK/LIGHT from your theme
        color="secondary"
        aria-label="roll dice"
        {...longPressProps}
        sx={{
          position: 'absolute',
          bottom: 120, 
          right: 32,
        }}
      >
        <CasinoIcon />
      </Fab>

      <Dialog open={isRollDialogOpen} onClose={handleCloseRollDialog}>
        {/* ... Dialog content is generally styled by the global theme ... */}
        <DialogTitle>Set Dice Formula</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Dice Formula"
            type="text"
            fullWidth
            variant="standard"
            value={rollFormula}
            onChange={(e) => setRollFormula(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleRollFromDialog()}
            placeholder="e.g., 2d6+3"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseRollDialog}>Cancel</Button>
          <Button onClick={handleRollFromDialog} variant="contained">Roll</Button>
        </DialogActions>
      </Dialog>
      
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={closeSnackbar}>
        {/* THEME USAGE: The `severity` prop on Alert automatically uses the theme's success, error, etc. colors */}
        <Alert onClose={closeSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      <Paper elevation={3} sx={{ p: 1, mt: 1 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            fullWidth
            placeholder="What do you do next?"
            multiline
            minRows={1}
            maxRows={5}
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isProcessingTurn}
          />
          {/* THEME USAGE: 'color="primary"' pulls BRAND_PRIMARY_DARK/LIGHT from your theme */}
          <IconButton onClick={handleSubmit} color="primary" disabled={isProcessingTurn || !userInput.trim()}>
            <SendIcon />
          </IconButton>
        </Stack>
      </Paper>
    </Box>
  );
};