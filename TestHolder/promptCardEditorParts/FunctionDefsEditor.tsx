import React from 'react';
import { TextField } from '@mui/material';
import { CollapsibleSection } from '../CollapsibleSection';
import { InfoDialog } from '../InfoDialog';

interface Props {
  functionDefs: string;
  onFunctionDefsChange: (value: string) => void;
}

export const FunctionDefsEditor: React.FC<Props> = ({ functionDefs, onFunctionDefsChange }) => (
  <CollapsibleSection title="Function Definitions" initiallyExpanded={false}>
    <TextField
      fullWidth
      multiline
      minRows={6}
      label={
        <>
          Function Definitions (JSON)
          <InfoDialog
            title="Function Definitions"
            content={`Provide JSON schemas for functions the AI can 'call'. This enables structured interaction with game systems.`}
          />
        </>
      }
      value={functionDefs}
      onChange={(e) => onFunctionDefsChange(e.target.value)}
      placeholder="e.g., { 'name': 'action', 'parameters': { ... } }"
    />
  </CollapsibleSection>
);