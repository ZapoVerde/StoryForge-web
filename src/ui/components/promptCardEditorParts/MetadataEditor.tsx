import React from 'react';
import { Box, Checkbox, FormControlLabel } from '@mui/material';
import { InfoDialog } from '../InfoDialog';

interface Props {
  isPublic: boolean;
  isExample: boolean;
  onCardChange: (updates: { isPublic: boolean; isExample: boolean }) => void;
}

export const MetadataEditor: React.FC<Props> = ({ isPublic, isExample, onCardChange }) => (
  <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 1 }}>
    <FormControlLabel
      control={
        <Checkbox
          checked={isPublic}
          onChange={(e) => onCardChange({ isPublic: e.target.checked, isExample })}
        />
      }
      label={
        <>
          Make Public (visible to others)
          <InfoDialog
            title="Public Card"
            content="If checked, this prompt card will be visible and potentially usable by other users."
          />
        </>
      }
    />
    <FormControlLabel
      control={
        <Checkbox
          checked={isExample}
          onChange={(e) => onCardChange({ isPublic, isExample: e.target.checked })}
        />
      }
      label={
        <>
          Is Example Card (for showcase)
          <InfoDialog
            title="Example Card"
            content="Mark this card as an official example. This is usually for built-in, curated content."
          />
        </>
      }
    />
  </Box>
);