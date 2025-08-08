// src/ui/components/PromptCardEditorSections/EmitSkeletonSection.tsx
import React from 'react';
import { Box, Typography, TextField } from '@mui/material';

interface EmitSkeletonSectionProps {
  emitSkeleton: string;
  onChange: (value: string) => void;
}

export const EmitSkeletonSection: React.FC<EmitSkeletonSectionProps> = ({ emitSkeleton, onChange }) => {
  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h6" gutterBottom>Emit Skeleton</Typography>
      <TextField
        label="Emit Skeleton JSON"
        multiline
        fullWidth
        minRows={6}
        value={emitSkeleton}
        onChange={(e) => onChange(e.target.value)}
      />
    </Box>
  );
};
