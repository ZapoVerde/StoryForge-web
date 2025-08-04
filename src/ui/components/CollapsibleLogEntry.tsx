// src/ui/components/CollapsibleLogEntry.tsx

import React from 'react';
import { Box, Typography, Divider } from '@mui/material';
import { LogEntry } from '../../models/LogEntry';
import { LogViewMode } from '../../utils/types';
import { CollapsibleSection } from './CollapsibleSection';
import { LogEntryDisplay } from './LogEntryDisplay';

interface CollapsibleLogEntryProps {
  entry: LogEntry;
  selectedLogViewModes: LogViewMode[];
}

export const CollapsibleLogEntry: React.FC<CollapsibleLogEntryProps> = ({ entry, selectedLogViewModes }) => {
  // Determine if there's any content to show based on selected modes
  const hasContent = selectedLogViewModes.some(mode => {
    switch (mode) {
      case LogViewMode.NARRATOR_OUTPUT: return !!entry.narratorOutput;
      case LogViewMode.USER_INPUT: return !!entry.userInput;
      case LogViewMode.DIGEST_LINES: return (entry.digestLines?.length || 0) > 0;
      case LogViewMode.DELTAS: return entry.deltas && Object.keys(entry.deltas).length > 0;
      case LogViewMode.CONTEXT_SNAPSHOT: return !!entry.contextSnapshot;
      case LogViewMode.TOKEN_USAGE: return !!entry.tokenUsage;
      case LogViewMode.AI_SETTINGS: return !!entry.aiSettings;
      case LogViewMode.API_DETAILS: return !!entry.apiUrl || !!entry.modelSlugUsed || entry.latencyMs !== null;
      case LogViewMode.ERROR_FLAGS: return (entry.errorFlags?.length || 0) > 0;
      case LogViewMode.MODEL_SLUG_USED: return !!entry.modelSlugUsed;
      default: return false;
    }
  });

  if (!hasContent) {
    // Optionally return null or a placeholder if no content is selected to display
    // For now, if the main entry title is desired even without content, keep rendering.
    // If you want to hide the whole entry if nothing is selected, uncomment below.
    // return null;
  }

  return (
    <CollapsibleSection
      title={`Turn ${entry.turnNumber} - ${new Date(entry.timestamp).toLocaleTimeString()}`}
      initiallyExpanded={entry.turnNumber === 0} // Expand Turn 0 by default
    >
      <Box sx={{ p: 1 }}>
        {selectedLogViewModes.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No log view modes selected for this entry. Please select modes from the "Log Views" menu.
          </Typography>
        ) : (
          selectedLogViewModes.map((mode, index) => (
            <React.Fragment key={mode}>
              <CollapsibleSection title={mode} initiallyExpanded={true}> {/* Inner collapsible for each mode */}
                <LogEntryDisplay mode={mode} entry={entry} hideTurnInfo={true} />
              </CollapsibleSection>
              {index < selectedLogViewModes.length - 1 && <Divider sx={{ my: 1 }} />}
            </React.Fragment>
          ))
        )}
      </Box>
    </CollapsibleSection>
  );
};