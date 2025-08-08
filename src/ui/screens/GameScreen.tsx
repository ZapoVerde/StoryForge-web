// src/ui/screens/GameScreen.tsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Paper, Typography, TextField, IconButton, Stack, Divider,
  CircularProgress, Button,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send'; // Using SendIcon for clarity
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import CasinoIcon from '@mui/icons-material/Casino'; // For dice rolls if you have them

// Import the store AND the specific selector you need
import { useGameStateStore, selectConversationHistory } from '../../state/useGameStateStore';
import { usePromptCardStore } from '../../state/usePromptCardStore';
import { PinnedItemsView } from '../components/PinnedItemsView';

export const GameScreen: React.FC = () => {
  const {
    gameLoading,
    currentSnapshot,
    isProcessingTurn,
    processTurn,
    resetGameFromSnapshot,
    rerollLastNarration,
  } = useGameStateStore();

  // FIX: Use the selector to get the conversation history
  const conversationHistory = useGameStateStore(selectConversationHistory);
  const activePromptCard = usePromptCardStore((state) => state.activePromptCard);

  const [userInput, setUserInput] = useState('');
  const logEndRef = useRef<HTMLDivElement>(null); // For auto-scrolling

  // Auto-scroll to the bottom of the conversation
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

  const handleReset = useCallback(() => {
    if (currentSnapshot && window.confirm("Are you sure you want to restart this turn? This will revert any changes made in the last narration.")) {
      resetGameFromSnapshot(currentSnapshot);
    }
  }, [currentSnapshot, resetGameFromSnapshot]);

  const handleReroll = useCallback(() => {
    if (window.confirm("Are you sure you want to reroll the last narration? The AI will try again with the same input.")) {
        rerollLastNarration();
    }
  }, [rerollLastNarration]);

  if (gameLoading || !activePromptCard) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
        <Typography variant="h6" ml={2}>Loading Game...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 2 }}>
      <PinnedItemsView />
      <Divider sx={{ my: 1 }} />

      <Box sx={{ flex: 1, overflowY: 'auto', px: 1 }}>
        {conversationHistory.map((msg, index) => (
          <Paper key={index} elevation={0} sx={{ p: 1.5, mb: 1.5, backgroundColor: 'transparent' }}>
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
          <IconButton onClick={handleSubmit} color="primary" disabled={isProcessingTurn || !userInput.trim()}>
            <SendIcon />
          </IconButton>
        </Stack>
        <Stack direction="row" spacing={1} sx={{ mt: 1, justifyContent: 'flex-end' }}>
          <Button size="small" variant="outlined" onClick={handleReroll} disabled={isProcessingTurn || conversationHistory.length < 2}>
            Reroll Last
          </Button>
          <Button size="small" variant="outlined" color="warning" onClick={handleReset} disabled={isProcessingTurn}>
            Restart Turn
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
};