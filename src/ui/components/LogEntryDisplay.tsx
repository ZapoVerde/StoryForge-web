// src/ui/components/LogEntryDisplay.tsx

import React from 'react';
import { Typography, Alert, Paper, Box } from '@mui/material'; // Add Paper and Box
import type { LogEntry } from '../../models';
import { LogViewMode } from '../../utils/types';

interface LogEntryDisplayProps {
  mode: LogViewMode;
  entry: LogEntry;
}

export const LogEntryDisplay: React.FC<LogEntryDisplayProps> = ({ mode, entry }) => {
  const renderContent = () => {
    switch (mode) {
      case LogViewMode.USER_INPUT:
        return entry.userInput || <Alert severity="info" sx={{mt:1}}>No user input for this turn (e.g., initial game state).</Alert>;

      case LogViewMode.NARRATOR_OUTPUT:
        return entry.prose || <Alert severity="info" sx={{mt:1}}>No prose was generated for this turn.</Alert>;
        
      case LogViewMode.RAW_NARRATOR_OUTPUT: // Add a case for the raw output if needed
        return entry.narratorOutput || <Alert severity="info" sx={{mt:1}}>No raw output was logged.</Alert>;

      case LogViewMode.DIGEST_LINES:
        if (!entry.digestLines || entry.digestLines.length === 0) return <Alert severity="info" sx={{mt:1}}>No digest lines.</Alert>;
        return entry.digestLines.map((d, i) => `(Importance ${d.importance}) ${d.text}`).join('\n');

      case LogViewMode.DELTAS:
        if (!entry.deltas || Object.keys(entry.deltas).length === 0) return <Alert severity="info" sx={{mt:1}}>No deltas.</Alert>;
        return JSON.stringify(entry.deltas, null, 2);

      case LogViewMode.CONTEXT_SNAPSHOT:
        return entry.contextSnapshot || <Alert severity="info" sx={{mt:1}}>No context snapshot was logged.</Alert>;

      case LogViewMode.TOKEN_USAGE:
        if (!entry.tokenUsage) return <Alert severity="info" sx={{mt:1}}>No token usage info.</Alert>;
        return `Input: ${entry.tokenUsage.inputTokens}, Output: ${entry.tokenUsage.outputTokens}, Total: ${entry.tokenUsage.totalTokens}`;

      case LogViewMode.AI_SETTINGS:
        if (!entry.aiSettings) return <Alert severity="info" sx={{mt:1}}>No AI settings logged.</Alert>;
        return JSON.stringify(entry.aiSettings, null, 2);

      case LogViewMode.API_DETAILS:
        const details = [
          `URL: ${entry.apiUrl || 'N/A'}`,
          `Latency: ${entry.latencyMs !== null ? `${entry.latencyMs}ms` : 'N/A'}`,
        ];
        return details.join('\n');

      // ADDED: New case for the request body.
      case LogViewMode.API_REQUEST_BODY:
        if (!entry.apiRequestBody) return <Alert severity="info" sx={{mt:1}}>No request body was logged.</Alert>;
        return (
            <Paper variant="outlined" sx={{ p: 1, mt: 1, backgroundColor: (theme) => theme.palette.action.hover }}>
              <Typography component="pre" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: '0.8rem' }}>
                {entry.apiRequestBody}
              </Typography>
            </Paper>
        );

      // ADDED: New case for the response body.
      case LogViewMode.API_RESPONSE_BODY:
        if (!entry.apiResponseBody) return <Alert severity="info" sx={{mt:1}}>No response body was logged.</Alert>;
        return (
            <Paper variant="outlined" sx={{ p: 1, mt: 1, backgroundColor: (theme) => theme.palette.action.hover }}>
              <Typography component="pre" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: '0.8rem' }}>
                {entry.apiResponseBody}
              </Typography>
            </Paper>
        );

      case LogViewMode.ERROR_FLAGS:
        if (!entry.errorFlags || entry.errorFlags.length === 0) return <Alert severity="success" sx={{mt:1}}>No errors flagged.</Alert>;
        return <Alert severity="error" sx={{mt:1}}>{entry.errorFlags.join(', ')}</Alert>;

      case LogViewMode.RAW_NARRATOR_OUTPUT:
        return entry.narratorOutput || <Alert severity="info" sx={{mt:1}}>No raw output was logged.</Alert>;
  
      case LogViewMode.MODEL_SLUG_USED: // ADD THIS CASE
        return entry.modelSlugUsed || <Alert severity="info" sx={{mt:1}}>Model slug was not logged.</Alert>;  

      default:
        return `Unknown log view mode: ${mode}`;
    }
  };

  // The outer component can be simplified as the inner content now handles its own formatting
  // We can create a list of modes that need special paper/box wrapping
  const needsWrapper = [LogViewMode.API_REQUEST_BODY, LogViewMode.API_RESPONSE_BODY, LogViewMode.ERROR_FLAGS];
  if (needsWrapper.includes(mode)) {
    return <Box>{renderContent()}</Box>;
  }

  return (
    <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', mt: 0.5, fontFamily: 'monospace', fontSize: '0.9rem' }}>
      {renderContent()}
    </Typography>
  );
};