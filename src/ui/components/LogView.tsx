// src/ui/components/LogView.tsx

import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import type { Message } from '../../models';

interface LogViewProps {
  conversationHistory: Message[];
  currentStreamingNarration: string; // The partially typed/streamed narration
  isProcessingTurn: boolean; // Flag if AI is still generating a response
  fullLatestNarration: string; // The complete narration text for the current turn
  enableStreaming: boolean; // Is streaming enabled for the active prompt card?
}

export const LogView: React.FC<LogViewProps> = ({
  conversationHistory,
  currentStreamingNarration,
  isProcessingTurn,
  fullLatestNarration,
  enableStreaming
}) => {
  // Determine if the last message in conversationHistory *is* the one we're currently processing/typing.
  // This is true if conversationHistory's last message content matches the fullLatestNarration.
  const lastMessageInHistoryIsLatest = 
    conversationHistory.length > 0 &&
    conversationHistory[conversationHistory.length - 1].role === 'assistant' &&
    conversationHistory[conversationHistory.length - 1].content === fullLatestNarration;

  // Decide which messages from history to render.
  // If the last message in history is the *same* as the full latest narration (and we are streaming/processing),
  // we effectively "replace" that history entry with our live streaming output.
  const messagesToRenderFromHistory = (enableStreaming && isProcessingTurn) || (enableStreaming && !lastMessageInHistoryIsLatest && fullLatestNarration.length > 0 && currentStreamingNarration !== fullLatestNarration)
    ? conversationHistory.slice(0, -1) // Exclude the very last message from history, as we will render it live
    : conversationHistory; // Render all messages from history

  return (
    <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
      {/* Render all previous complete messages */}
      {messagesToRenderFromHistory.map((message, index) => (
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
          ) : message.role === 'assistant' ? (
            <>
              <Typography variant="body2" sx={{ fontWeight: 'bold', color: (theme) => theme.palette.secondary.dark }}>
                AI Narrator:
              </Typography>
              <Typography variant="body1">
                {message.content}
              </Typography>
            </>
          ) : null}
        </Paper>
      ))}

      {/* Conditionally render the latest assistant narration, potentially streaming */}
      {/* This block renders the current AI response, whether it's loading, streaming, or fully displayed */}
      {fullLatestNarration && ( // Only render if there's *any* latest narration content
        <Paper elevation={0} sx={{ p: 1.5, mb: 1.5, backgroundColor: 'transparent' }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold', color: (theme) => theme.palette.secondary.dark }}>
            AI Narrator:
          </Typography>
          <Typography variant="body1">
            {isProcessingTurn || (enableStreaming && currentStreamingNarration !== fullLatestNarration)
              ? currentStreamingNarration // Show streaming text if processing or still typing
              : fullLatestNarration}      {/* Show full text if not streaming or streaming is complete */}
          </Typography>
        </Paper>
      )}

      {/* Display initial message if no content */}
      {conversationHistory.length === 0 && !fullLatestNarration && (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
          The story begins...
        </Typography>
      )}
    </Box>
  );
};