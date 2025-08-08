// src/ui/components/PromptCardEditorSections/PromptSection.tsx
import React from 'react';
import { Box, Typography, TextField } from '@mui/material';

interface PromptSectionProps {
  prompt: string;
  onChange: (value: string) => void;
}

export const PromptSection: React.FC<PromptSectionProps> = ({ prompt, onChange }) => {
  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h6" gutterBottom>Core Prompt</Typography>
      <TextField
        label="Prompt Text"
        multiline
        fullWidth
        minRows={6}
        value={prompt}
        onChange={(e) => onChange(e.target.value)}
      />
    </Box>
  );
};
