// src/ui/components/LogEntryDisplay.tsx

import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import type { LogEntry } from '../../models';
import { LogViewMode } from '../../utils/types';

interface LogEntryDisplayProps {
 mode: LogViewMode;
 entry: LogEntry;
 hideTurnInfo?: boolean; // New optional prop
}

export const LogEntryDisplay: React.FC<LogEntryDisplayProps> = ({ mode, entry, hideTurnInfo }) => {
 const renderContent = () => {
  switch (mode) {
   case LogViewMode.NARRATOR_OUTPUT:
    return entry.narratorOutput;
   case LogViewMode.USER_INPUT:
    return entry.userInput;
   case LogViewMode.DIGEST_LINES:
    // MODIFIED: Use `d.importance` which should now be correct
    return entry.digestLines.map(d => `${d.text} (Imp: ${d.importance})`).join('\n');
   case LogViewMode.DELTAS:
    return entry.deltas ? JSON.stringify(entry.deltas, null, 2) : 'No Deltas';
   case LogViewMode.CONTEXT_SNAPSHOT:
    return entry.contextSnapshot ? entry.contextSnapshot : 'No Context Snapshot';
   case LogViewMode.TOKEN_USAGE:
    return entry.tokenUsage ? `Input: ${entry.tokenUsage.inputTokens}, Output: ${entry.tokenUsage.outputTokens}, Total: ${entry.tokenUsage.totalTokens}` : 'No Token Usage Info';
   case LogViewMode.AI_SETTINGS:
    return entry.aiSettings ? JSON.stringify(entry.aiSettings, null, 2) : 'No AI Settings';
   case LogViewMode.API_DETAILS: {
      // MODIFIED: Build a more detailed API details string
     const details = [
      `URL: ${entry.apiUrl || 'N/A'}`,
      `Model: ${entry.modelSlugUsed || 'N/A'}`,
      `Latency: ${entry.latencyMs !== null ? `${entry.latencyMs}ms` : 'N/A'}`,
     ];
      if (entry.apiRequestBody) {
        details.push(`\n--- Request Body (without content) ---\n${entry.apiRequestBody}`);
      }
      if (entry.apiResponseBody) {
        details.push(`\n--- Response Body ---\n${entry.apiResponseBody}`);
      }
      return details.join('\n');
    }
   case LogViewMode.ERROR_FLAGS:
    return entry.errorFlags && entry.errorFlags.length > 0 ? entry.errorFlags.join(', ') : 'No Errors';
   case LogViewMode.MODEL_SLUG_USED:
     return entry.modelSlugUsed || 'N/A';
   default:
    return 'Select a view mode.';
  }
 };

  return (
    <Box sx={{ mb: 1.5 }}>
      {/* Conditionally render turn info based on new prop */}
      {!hideTurnInfo && (
        <Typography variant="caption" color="text.secondary">
          Turn {entry.turnNumber} - {new Date(entry.timestamp).toLocaleTimeString()}
        </Typography>
      )}
      <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', mt: 0.5 }}>
        {renderContent()}
      </Typography>
    </Box>
  );
};