// src/ui/components/PromptCardEditorSections/WorldStateInitSection.tsx
import React from 'react';
import { Box, Typography, TextField } from '@mui/material';

interface WorldStateInitSectionProps {
  worldState: string;
  onChange: (value: string) => void;
}

export const WorldStateInitSection: React.FC<WorldStateInitSectionProps> = ({ worldState, onChange }) => {
  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h6" gutterBottom>Initial World State</Typography>
      <TextField
        label="World State JSON"
        multiline
        fullWidth
        minRows={8}
        value={worldState}
        onChange={(e) => onChange(e.target.value)}
      />
    </Box>
  );
};
