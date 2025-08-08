// src/ui/components/PromptCardListPanel.tsx
import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import type { PromptCard } from '../../models';
import { PromptCardList } from './PromptCardList';

interface PromptCardListPanelProps {
  cards: PromptCard[];
  activeCardId: string | null;
  onSelectCard: (card: PromptCard) => void;
  onDeleteCard: (cardId: string) => void;
  onDuplicateCard: (cardId: string) => void;
  onExportCard: (cardId: string) => void;
  onNewCard: () => void;
  onImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export const PromptCardListPanel: React.FC<PromptCardListPanelProps> = ({
  cards,
  activeCardId,
  onSelectCard,
  onDeleteCard,
  onDuplicateCard,
  onExportCard,
  onNewCard,
  onImport,
}) => {
  return (
    <>
      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="h6" component="h2">
          Card Library
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            onClick={onNewCard}
            startIcon={<AddIcon />}
            size="small"
          >
            New Card
          </Button>
          <Button
            variant="outlined"
            component="label"
            startIcon={<FileUploadIcon />}
            size="small"
          >
            Import
            <input type="file" hidden accept=".json" onChange={onImport} multiple />
          </Button>
        </Box>
      </Box>
      <PromptCardList
        cards={cards}
        activeCardId={activeCardId}
        onSelectCard={onSelectCard}
        onDeleteCard={onDeleteCard}
        onDuplicateCard={onDuplicateCard}
        onExportCard={onExportCard}
      />
    </>
  );
};