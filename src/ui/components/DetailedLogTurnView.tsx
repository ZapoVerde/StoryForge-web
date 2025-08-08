// src/ui/components/DetailedLogTurnView.tsx

import React from 'react';
import { Box, Divider } from '@mui/material';
import { LogViewMode } from '../../utils/types';
import type { LogEntry } from '../../models';
import { CollapsibleSection } from './CollapsibleSection';
import { LogEntryDisplay } from './LogEntryDisplay';

interface DetailedLogTurnViewProps {
  entry: LogEntry;
  selectedLogViewModes: LogViewMode[];
}

// This defines the ideal chronological and logical order of log parts.
const RENDER_ORDER: LogViewMode[] = [
    LogViewMode.API_DETAILS, // Metadata first
    LogViewMode.CONTEXT_SNAPSHOT,
    LogViewMode.API_REQUEST_BODY, // Then the request body
    LogViewMode.USER_INPUT,
    LogViewMode.RAW_NARRATOR_OUTPUT,
    LogViewMode.API_RESPONSE_BODY, // Then the response body
    LogViewMode.NARRATOR_OUTPUT,
    LogViewMode.DIGEST_LINES,
    LogViewMode.DELTAS,
    // These are metadata and appear last
    LogViewMode.MODEL_SLUG_USED,
    LogViewMode.AI_SETTINGS,
    LogViewMode.TOKEN_USAGE,
    LogViewMode.ERROR_FLAGS,
  ];

export const DetailedLogTurnView: React.FC<DetailedLogTurnViewProps> = ({ entry, selectedLogViewModes }) => {
  // Filter the master RENDER_ORDER array to only include modes the user has selected.
  const viewsToRender = RENDER_ORDER.filter(mode => selectedLogViewModes.includes(mode));

  if (viewsToRender.length === 0) {
    return null; // Don't render anything for this turn if no relevant views are selected
  }

  return (
    // Each turn is its own collapsible section
    <CollapsibleSection
      title={`Turn ${entry.turnNumber} - ${new Date(entry.timestamp).toLocaleTimeString()}`}
      initiallyExpanded={entry.turnNumber === 0 || !!entry.errorFlags?.length} // Expand first turn or turns with errors
    >
      <Box sx={{ p: 1 }}>
        {viewsToRender.map((mode, index) => (
          <React.Fragment key={mode}>
            {/* Each part of the log within the turn is ALSO a collapsible section */}
            <CollapsibleSection title={mode} initiallyExpanded={true}>
              <LogEntryDisplay mode={mode} entry={entry} />
            </CollapsibleSection>
            {index < viewsToRender.length - 1 && <Divider sx={{ my: 1.5, opacity: 0.5 }} />}
          </React.Fragment>
        ))}
      </Box>
    </CollapsibleSection>
  );
};