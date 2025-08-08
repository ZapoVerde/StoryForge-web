import React from 'react';
import { TextField } from '@mui/material';
import { CollapsibleSection } from '../CollapsibleSection';
import { InfoDialog } from '../InfoDialog';

interface Props {
  gameRules: string;
  onGameRulesChange: (value: string) => void;
}

export const GameRulesEditor: React.FC<Props> = ({ gameRules, onGameRulesChange }) => (
  <CollapsibleSection title="Game Rules Skeleton" initiallyExpanded={false}>
    <TextField
      fullWidth
      multiline
      minRows={5}
      label={
        <>
          Game Rules
          <InfoDialog
            title="Game Rules"
            content="Textual rules or guidelines for the AI to follow throughout the game. This is always included in the AI prompt."
          />
        </>
      }
      value={gameRules}
      onChange={(e) => onGameRulesChange(e.target.value)}
      placeholder="Rules for the AI to follow during gameplay."
    />
  </CollapsibleSection>
);