// src/ui/components/LogEntryDisplay.tsx

import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { LogEntry } from '../../models/LogEntry';
import { LogViewMode } from '../../utils/types';

interface LogEntryDisplayProps {
  mode: LogViewMode;
  entry: LogEntry;
}

export const LogEntryDisplay: React.FC<LogEntryDisplayProps> = ({ mode, entry }) => {
  const renderContent = () => {
    switch (mode) {
      case LogViewMode.NARRATOR_OUTPUT:
        return entry.narratorOutput;
      case LogViewMode.USER_INPUT:
        return entry.userInput;
      case LogViewMode.DIGEST_LINES:
        return entry.digestLines.map(d => `${d.text} (Imp: ${d.importance})`).join('\n');
      case LogViewMode.DELTAS:
        return entry.deltas ? JSON.stringify(entry.deltas, null, 2) : 'No Deltas';
      case LogViewMode.CONTEXT_SNAPSHOT:
        return entry.contextSnapshot ? entry.contextSnapshot : 'No Context Snapshot';
      case LogViewMode.TOKEN_USAGE:
        return entry.tokenUsage ? `Input: ${entry.tokenUsage.inputTokens}, Output: ${entry.tokenUsage.outputTokens}, Total: ${entry.tokenUsage.totalTokens}` : 'No Token Usage Info';
      case LogViewMode.AI_SETTINGS:
        return entry.aiSettings ? JSON.stringify(entry.aiSettings, null, 2) : 'No AI Settings';
      case LogViewMode.API_DETAILS:
        return `URL: ${entry.apiUrl || 'N/A'}\nModel: ${entry.modelSlugUsed || 'N/A'}\nLatency: ${entry.latencyMs || 'N/A'}ms`;
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
      <Typography variant="caption" color="text.secondary">
        Turn {entry.turnNumber} - {new Date(entry.timestamp).toLocaleTimeString()}
      </Typography>
      <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', mt: 0.5 }}>
        {renderContent()}
      </Typography>
    </Box>
  );
};