import React from 'react';
import { TextField } from '@mui/material';
import { CollapsibleSection } from '../CollapsibleSection';
import { InfoDialog } from '../InfoDialog';

interface Props {
  prompt: string;
  onPromptChange: (prompt: string) => void;
}

export const CorePromptEditor: React.FC<Props> = ({ prompt, onPromptChange }) => (
  <CollapsibleSection title="AI Prompt" initiallyExpanded={true}>
    <TextField
      fullWidth
      multiline
      minRows={5}
      label={
        <>
          Core Scenario / Persona Prompt
          <InfoDialog
            title="Core Scenario / Persona Prompt"
            content="This is the most important part of your prompt card. It defines the core scenario, the AI's persona, the setting, and any foundational rules. This text is ALWAYS sent to the AI."
          />
        </>
      }
      value={prompt}
      onChange={(e) => onPromptChange(e.target.value)}
    />
  </CollapsibleSection>
);