// src/ui/components/LogView.tsx

import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
// MODIFIED: Import Message model instead of LogEntry
import { Message } from '../../models/Message';

interface LogViewProps {
 // MODIFIED: Expect conversationHistory of type Message[]
 conversationHistory: Message[];
}

export const LogView: React.FC<LogViewProps> = ({ conversationHistory }) => {
 return (
  <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
   {conversationHistory.length === 0 ? (
    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
     The story begins...
    </Typography>
   ) : (
    // MODIFIED: Map over conversationHistory
    conversationHistory.map((message, index) => (
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
    ))
   )}
  </Box>
 );
};