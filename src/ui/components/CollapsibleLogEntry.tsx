// src/ui/components/CollapsibleLogEntry.tsx

import React from 'react';
import { Box, Typography, Divider } from '@mui/material';
import type { LogEntry } from '../../models/LogEntry';
import { LogViewMode } from '../../utils/types';
import { CollapsibleSection } from './CollapsibleSection';
// This component should be importing DetailedLogTurnView or LogEntryDisplay
// Let's assume you're building out the detailed view as discussed.
// If you're using the simpler LogEntryDisplay, the fix is the same.
import { LogEntryDisplay } from './LogEntryDisplay';

interface CollapsibleLogEntryProps {
  entry: LogEntry;
  selectedLogViewModes: LogViewMode[];
}

// NOTE: This component might be redundant if `DetailedLogTurnView` does everything.
// However, fixing the error is straightforward.
export const CollapsibleLogEntry: React.FC<CollapsibleLogEntryProps> = ({ entry, selectedLogViewModes }) => {
  // ... (logic to check if there's content remains the same)

  return (
    <CollapsibleSection
      title={`Turn ${entry.turnNumber} - ${new Date(entry.timestamp).toLocaleTimeString()}`}
      initiallyExpanded={entry.turnNumber === 0}
    >
      <Box sx={{ p: 1 }}>
        {selectedLogViewModes.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No log view modes selected.
          </Typography>
        ) : (
          selectedLogViewModes.map((mode, index) => (
            <React.Fragment key={mode}>
              <CollapsibleSection title={mode} initiallyExpanded={true}>
                {/* --- THE FIX IS HERE --- */}
                {/* Remove the hideTurnInfo prop */}
                <LogEntryDisplay mode={mode} entry={entry} />
              </CollapsibleSection>
              {index < selectedLogViewModes.length - 1 && <Divider sx={{ my: 1 }} />}
            </React.Fragment>
          ))
        )}
      </Box>
    </CollapsibleSection>
  );
};
