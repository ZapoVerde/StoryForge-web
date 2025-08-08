// src/ui/components/PromptCardCard.tsx
import React from 'react';
import {
  Card, CardContent, CardActions, Typography, IconButton, Tooltip,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import type { PromptCard } from '../../models';

interface PromptCardCardProps {
  card: PromptCard;
  onEdit: () => void;
  onDelete: () => void;
}

export const PromptCardCard: React.FC<PromptCardCardProps> = ({ card, onEdit, onDelete }) => {
  return (
    <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Typography variant="h6" gutterBottom>{card.title || 'Untitled Card'}</Typography>
        <Typography variant="body2" color="text.secondary">
          {card.prompt.slice(0, 100)}{card.prompt.length > 100 ? '…' : ''}
        </Typography>
      </CardContent>
      <CardActions>
        <Tooltip title="Edit Card">
          <IconButton onClick={onEdit}><EditIcon /></IconButton>
        </Tooltip>
        <Tooltip title="Delete Card">
          <IconButton onClick={onDelete}><DeleteIcon /></IconButton>
        </Tooltip>
      </CardActions>
    </Card>
  );
};
