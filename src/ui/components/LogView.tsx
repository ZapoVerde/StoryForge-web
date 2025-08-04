// src/ui/components/LogView.tsx

import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { LogEntry } from '../../models/LogEntry'; // Assuming LogEntry model

interface LogViewProps {
 logEntries: LogEntry[];
}

export const LogView: React.FC<LogViewProps> = ({ logEntries }) => {
 return (
  <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
   {logEntries.length === 0 ? (
    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
     No turns logged yet. Start playing!
    </Typography>
   ) : (
    logEntries.map((entry, index) => (
     <Paper key={index} elevation={0} sx={{ p: 1.5, mb: 1.5, backgroundColor: 'transparent' }}>
      <Typography variant="body2" sx={{ fontWeight: 'bold', color: (theme) => theme.palette.primary.dark }}>
       You (Turn {entry.turnNumber}):
      </Typography>
      <Typography variant="body1" sx={{ mb: 1 }}>
       {entry.userInput}
      </Typography>
      {/* MODIFIED: Check for entry.prose instead of entry.narratorOutput */}
      {entry.prose && (
       <>
        <Typography variant="body2" sx={{ fontWeight: 'bold', color: (theme) => theme.palette.secondary.dark }}>
         AI Narrator:
        </Typography>
        <Typography variant="body1">
         {/* MODIFIED: Display the clean prose. Fallback to raw output if prose is missing (for older data). */}
         {entry.prose || entry.narratorOutput}
        </Typography>
       </>
      )}
     </Paper>
    ))
   )}
  </Box>
 );
};