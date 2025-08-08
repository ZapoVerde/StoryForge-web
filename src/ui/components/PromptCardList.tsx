import React from 'react';
import {
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Typography,
  Divider,
  IconButton,
  Box,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import type { PromptCard } from '../../models';

interface PromptCardListProps {
  cards: PromptCard[];
  activeCardId: string | null;
  onSelectCard: (card: PromptCard) => void;
  onDeleteCard: (cardId: string) => void;
  onDuplicateCard: (cardId: string) => void;
  onExportCard: (cardId: string) => void;
}

export const PromptCardList: React.FC<PromptCardListProps> = ({
  cards,
  activeCardId,
  onSelectCard,
  onDeleteCard,
  onDuplicateCard,
  onExportCard,
}) => {
  return (
    <>
      <Typography variant="h6" sx={{ p: 2, pb: 1 }}>
        Your Cards
      </Typography>
      <Divider />
      <List>
        {cards.length === 0 ? (
          <ListItem>
            <ListItemText
              primary="No cards yet. Create one!"
              sx={{ textAlign: 'center' }}
            />
          </ListItem>
        ) : (
          cards.map((card) => (
            <ListItem
              key={card.id}
              disablePadding
              secondaryAction={
                <Box>
                  <IconButton
                    edge="end"
                    aria-label="duplicate"
                    onClick={() => onDuplicateCard(card.id)}
                  >
                    <ContentCopyIcon />
                  </IconButton>
                  <IconButton
                    edge="end"
                    aria-label="export"
                    onClick={() => onExportCard(card.id)}
                  >
                    <FileDownloadIcon />
                  </IconButton>
                  <IconButton
                    edge="end"
                    aria-label="delete"
                    onClick={() => onDeleteCard(card.id)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              }
            >
              <ListItemButton
                selected={activeCardId === card.id}
                onClick={() => onSelectCard(card)}
              >
                <ListItemText primary={card.title || 'Untitled Card'} />
              </ListItemButton>
            </ListItem>
          ))
        )}
      </List>
    </>
  );
};
