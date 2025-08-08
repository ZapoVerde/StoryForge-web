// src/ui/screens/GameScreen.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Paper, Typography, TextField, IconButton, Stack, Divider,
  CircularProgress, Button,
} from '@mui/material';
import CasinoIcon from '@mui/icons-material/Casino';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { LogView } from '../components/LogView';
import { useGameStateStore } from '../../state/useGameStateStore';
import { usePromptCardStore } from '../../state/usePromptCardStore';
import { PinnedItemsView } from '../components/PinnedItemsView';

export const GameScreen: React.FC = () => {
  const {
    gameLoading,
    currentSnapshot,
    conversationHistory,
    processTurn,
    resetGameFromSnapshot,
    rerollLastNarration,
  } = useGameStateStore();

  const activePromptCard = usePromptCardStore((state) => state.activePromptCard);

  const [userInput, setUserInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [conversationHistory]);

  const handleSubmit = async () => {
    if (!userInput.trim()) return;
    await processTurn(userInput);
    setUserInput('');
  };

  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [userInput]);

  const handleReset = () => {
    if (currentSnapshot) {
      resetGameFromSnapshot(currentSnapshot);
    }
  };

  const handleReroll = () => {
    rerollLastNarration();
  };

  const renderMessages = () => {
    return conversationHistory.map((msg, index) => (
      <Box key={index} sx={{ mb: 2 }}>
        <Typography variant="subtitle2" color="text.secondary">
          {msg.role === 'user' ? 'Player' : 'Narrator'}
        </Typography>
        <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
          {msg.content}
        </Typography>
        <Divider sx={{ my: 1 }} />
      </Box>
    ));
  };

  if (gameLoading || !activePromptCard) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6">Loading game...</Typography>
        <CircularProgress sx={{ mt: 2 }} />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <PinnedItemsView />
      <Box sx={{ flex: 1, overflowY: 'auto', px: 3, pt: 1 }}>
        {renderMessages()}
      </Box>

      <Box sx={{ p: 2, borderTop: '1px solid #ccc', display: 'flex', alignItems: 'center' }}>
        <TextField
          fullWidth
          placeholder="Type your action..."
          multiline
          minRows={2}
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          onKeyPress={handleKeyPress}
          inputRef={inputRef}
        />
        <IconButton onClick={handleSubmit} size="large" sx={{ ml: 1 }}>
          <CasinoIcon />
        </IconButton>
      </Box>

      <Stack direction="row" spacing={2} sx={{ p: 2, justifyContent: 'flex-end' }}>
        <Button variant="outlined" onClick={handleReset} startIcon={<RestartAltIcon />}>
          Reset
        </Button>
        <Button variant="outlined" onClick={handleReroll}>
          Reroll
        </Button>
      </Stack>
    </Box>
  );
};
