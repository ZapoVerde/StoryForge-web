import React from 'react';
import { TextField } from '@mui/material';
import { CollapsibleSection } from '../CollapsibleSection';
import { InfoDialog } from '../InfoDialog';

interface Props {
  title: string;
  description: string | null;
  onCardChange: (updates: { title: string; description: string | null }) => void;
}

export const TitleAndDescriptionEditor: React.FC<Props> = ({ title, description, onCardChange }) => (
  <CollapsibleSection title="Title & Description" initiallyExpanded={true}>
    <TextField
      fullWidth
      label={
        <>
          Title
          <InfoDialog
            title="Prompt Card Title"
            content="A short, descriptive name for this prompt card. Used for display in the game library and manager."
          />
        </>
      }
      value={title}
      onChange={(e) => onCardChange({ title: e.target.value, description })}
      sx={{ mb: 2 }}
    />
    <TextField
      fullWidth
      label={
        <>
          Description
          <InfoDialog
            title="Prompt Card Description"
            content="An optional, longer explanation of what this prompt card is about. It is NOT sent to the AI."
          />
        </>
      }
      multiline
      minRows={2}
      value={description || ''}
      onChange={(e) => onCardChange({ title, description: e.target.value || null })}
      placeholder="Optional: A short description for this prompt card."
    />
  </CollapsibleSection>
);