import React from 'react';
import { TextField } from '@mui/material';
import { CollapsibleSection } from '../CollapsibleSection';
import { InfoDialog } from '../InfoDialog';
import { DEFAULT_FIRST_TURN_PROMPT_BLOCK } from '../../../data/config/promptCardDefaults';

interface Props {
  firstTurnOnlyBlock: string;
  onFirstTurnChange: (value: string) => void;
}

export const FirstTurnEditor: React.FC<Props> = ({ firstTurnOnlyBlock, onFirstTurnChange }) => (
  <CollapsibleSection title="First Turn Scene Setup" initiallyExpanded={false}>
    <TextField
      fullWidth
      multiline
      minRows={4}
      label={
        <>
          Intro scene shown only on turn 1
          <InfoDialog
            title="First Turn Only Block"
            content={`This text is added to the AI's prompt ONLY for the very first turn of a new game. It's ideal for setting an initial scene.`}
          />
        </>
      }
      value={firstTurnOnlyBlock}
      onChange={(e) => onFirstTurnChange(e.target.value)}
      placeholder={DEFAULT_FIRST_TURN_PROMPT_BLOCK}
    />
  </CollapsibleSection>
);