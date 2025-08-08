import React from 'react';
import { TextField } from '@mui/material';
import { CollapsibleSection } from '../CollapsibleSection';
import { InfoDialog } from '../InfoDialog';

interface Props {
  worldStateInit: string;
  onWorldStateInitChange: (value: string) => void;
}

export const WorldStateInitEditor: React.FC<Props> = ({ worldStateInit, onWorldStateInitChange }) => (
  <CollapsibleSection title="World State Initialization" initiallyExpanded={false}>
    <TextField
      fullWidth
      multiline
      minRows={5}
      label={
        <>
          Initial World State (JSON)
          <InfoDialog
            title="Initial World State (JSON)"
            content={`A JSON object defining the starting state of your game world. This is loaded once at the beginning of a new game session.`}
          />
        </>
      }
      value={worldStateInit}
      onChange={(e) => onWorldStateInitChange(e.target.value)}
      placeholder="{}"
    />
  </CollapsibleSection>
);