// src/ui/screens/LogViewerScreen.tsx

import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { useGameStateStore } from '../../state/useGameStateStore';
import type { Message, LogEntry } from '../../models';

export const LogViewerScreen: React.FC = () => {
  const conversationHistory = useGameStateStore(state => state.conversationHistory);
  const logEntries = useGameStateStore(state => state.logEntries);

  return (
    <Box p={2}>
      <Typography variant="h6">Conversation History</Typography>
      {conversationHistory.map((msg: Message, index: number) => (
        <Paper key={index} sx={{ p: 1, my: 1 }}>
          <Typography variant="subtitle2">{msg.role}</Typography>
          <Typography variant="body2">{msg.content}</Typography>
        </Paper>
      ))}

      <Typography variant="h6" mt={4}>Log Entries</Typography>
      {logEntries.map((entry: LogEntry, index: number) => (
        <Paper key={index} sx={{ p: 1, my: 1 }}>
          <Typography variant="subtitle2">Turn {entry.turnNumber}</Typography>
          <Typography variant="body2">{entry.prose}</Typography>
        </Paper>
      ))}
    </Box>
  );
};
