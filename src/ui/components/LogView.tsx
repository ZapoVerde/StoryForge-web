// src/ui/components/LogView.tsx

import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import type { Message } from '../../models';

interface LogViewProps {
  conversationHistory: Message[];
  currentStreamingNarration: string;
  isProcessingTurn: boolean;
  fullLatestNarration: string;
  enableStreaming: boolean;
}

export const LogView: React.FC<LogViewProps> = ({
  conversationHistory,
  currentStreamingNarration,
  isProcessingTurn,
  fullLatestNarration,
  enableStreaming
}) => {
  const isInitialDisplay = conversationHistory.length === 0;

  const lastMessageInHistoryIsLatest =
    conversationHistory.length > 0 &&
    conversationHistory[conversationHistory.length - 1].role === 'assistant' &&
    conversationHistory[conversationHistory.length - 1].content === fullLatestNarration;

  const messagesToRenderFromHistory =
    (enableStreaming && isProcessingTurn) ||
    (enableStreaming && !lastMessageInHistoryIsLatest && fullLatestNarration.length > 0 && currentStreamingNarration !== fullLatestNarration)
      ? conversationHistory.slice(0, -1)
      : conversationHistory;

  return (
    <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
      {isInitialDisplay ? (
        // Show initial prose block if there's no prior conversation
        <Paper elevation={0} sx={{ p: 1.5, mb: 1.5, backgroundColor: 'transparent' }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold', color: (theme) => theme.palette.secondary.dark }}>
            AI Narrator:
          </Typography>
          <Typography variant="body1">
            {fullLatestNarration}
          </Typography>
        </Paper>
      ) : (
        messagesToRenderFromHistory.map((message, index) => (
          <Paper key={index} elevation={0} sx={{ p: 1.5, mb: 1.5, backgroundColor: 'transparent' }}>
            {message.role === 'user' ? (
              <>
                <Typography variant="body2" sx={{ fontWeight: 'bold', color: (theme) => theme.palette.primary.dark }}>
                  You:
                </Typography>
                <Typography variant="body1" sx={{ mb: 1 }}>
                  {message.content}
                </Typography>
              </>
            ) : (
              <>
                <Typography variant="body2" sx={{ fontWeight: 'bold', color: (theme) => theme.palette.secondary.dark }}>
                  AI Narrator:
                </Typography>
                <Typography variant="body1">
                  {message.content}
                </Typography>
              </>
            )}
          </Paper>
        ))
      )}

{!isInitialDisplay && fullLatestNarration && !lastMessageInHistoryIsLatest && (
        <Paper elevation={0} sx={{ p: 1.5, mb: 1.5, backgroundColor: 'transparent' }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold', color: (theme) => theme.palette.secondary.dark }}>
            AI Narrator:
          </Typography>
          <Typography variant="body1">
            {isProcessingTurn || (enableStreaming && currentStreamingNarration !== fullLatestNarration)
              ? currentStreamingNarration
              : fullLatestNarration}
          </Typography>
        </Paper>
      )}
    </Box>
  );
};