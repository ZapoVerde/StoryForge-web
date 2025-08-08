// src/ui/components/PromptCardEditorPanel.tsx
import React from 'react';
import { Box, Typography, Button, CircularProgress } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import type { PromptCard, AiConnection } from '../../models';
import PromptCardEditor from '../screens/PromptCardEditor'; // Note: This should eventually move to components

interface PromptCardEditorPanelProps {
  localEditedCard: PromptCard | null;
  isCardDirty: boolean;
  availableConnections: AiConnection[];
  onCardChange: (updatedCard: PromptCard) => void;
  onRevert: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onStartGame: () => void;
}

export const PromptCardEditorPanel: React.FC<PromptCardEditorPanelProps> = ({
  localEditedCard,
  isCardDirty,
  availableConnections,
  onCardChange,
  onRevert,
  onSave,
  onSaveAs,
  onStartGame,
}) => {
  if (!localEditedCard) {
    return (
      <Box sx={{ textAlign: 'center', p: 4, mt: 4 }}>
        <Typography variant="h6" color="text.secondary">
          Select a card or create a new one to begin editing.
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <Box
        sx={{
          p: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
          position: 'sticky',
          top: 0,
          backgroundColor: 'background.paper',
          zIndex: 1,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        <Typography variant="h6">{localEditedCard.title}</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {isCardDirty && (
            <>
              <Button variant="outlined" onClick={onRevert}>
                Revert
              </Button>
              <Button variant="contained" onClick={onSave}>
                Save Changes
              </Button>
            </>
          )}
          <Button variant="outlined" onClick={onSaveAs}>
            Save As...
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={onStartGame}
            startIcon={<PlayArrowIcon />}
            disabled={isCardDirty}
          >
            Start Game
          </Button>
        </Box>
      </Box>
      <PromptCardEditor
        card={localEditedCard}
        onCardChange={onCardChange}
        availableConnections={availableConnections}
      />
    </>
  );
};