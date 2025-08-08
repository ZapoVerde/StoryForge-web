// src/ui/components/PromptCardEditorSections/GameRulesSection.tsx
import React from 'react';
import { Box, Typography, TextField } from '@mui/material';

interface GameRulesSectionProps {
  gameRules: string;
  onChange: (value: string) => void;
}

export const GameRulesSection: React.FC<GameRulesSectionProps> = ({ gameRules, onChange }) => {
  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h6" gutterBottom>Game Rules</Typography>
      <TextField
        label="Rules Text"
        multiline
        fullWidth
        minRows={6}
        value={gameRules}
        onChange={(e) => onChange(e.target.value)}
      />
    </Box>
  );
};
