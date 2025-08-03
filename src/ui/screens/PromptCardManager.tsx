// src/ui/screens/PromptCardManager.tsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Paper,
  Divider,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Snackbar
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import FileDownloadIcon from '@mui/icons-material/FileDownload';

import { usePromptCardStore } from '../../state/usePromptCardStore';
import { useAuthStore } from '../../state/useAuthStore';
import { useGameStateStore } from '../../state/useGameStateStore';
import { PromptCard, NewPromptCardData } from '../../models/index';
import PromptCardEditor from './PromptCardEditor'; // Editor component

interface PromptCardManagerProps {
  onNavToggle: () => void;
}

const PromptCardManager: React.FC<PromptCardManagerProps> = ({ onNavToggle }) => {
  const { user } = useAuthStore();
  const {
    promptCards,
    activePromptCard,
    isLoading,
    error,
    fetchPromptCards,
    setActivePromptCard,
    addPromptCard,
    updatePromptCard,
    duplicatePromptCard,
    deletePromptCard,
    fetchAiConnections,
    importPromptCards,
    exportPromptCard,
    aiConnections,
  } = usePromptCardStore();
  const { initializeGame } = useGameStateStore();

  const [localEditedCard, setLocalEditedCard] = useState<PromptCard | null>(null);
  const [isCardDirty, setIsCardDirty] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveAsNewTitle, setSaveAsNewTitle] = useState('');
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info'>('info');

  useEffect(() => {
    if (user?.uid) {
      fetchPromptCards(user.uid);
      fetchAiConnections(user.uid);
    }
  }, [user?.uid, fetchPromptCards, fetchAiConnections]);

  useEffect(() => {
    // Sync localEditedCard with activePromptCard
    setLocalEditedCard(activePromptCard ? { ...activePromptCard } : null);
    setIsCardDirty(false); // Reset dirty state when active card changes
  }, [activePromptCard]);

  const handleCardSelect = (card: PromptCard) => {
    setActivePromptCard(card);
  };

  const handleNewCard = async () => {
    if (!user?.uid) {
      setSnackbarMessage('Must be logged in to create a new card.');
      setSnackbarSeverity('error');
      return;
    }
    const newCardData: NewPromptCardData = {
      title: "New Prompt Card",
      prompt: "This is a new prompt card. Describe the setting and your character's starting situation.",
    };
    try {
      const createdCard = await addPromptCard(user.uid, newCardData);
      if (createdCard) {
        setActivePromptCard(createdCard);
        setSnackbarMessage('New card created successfully!');
        setSnackbarSeverity('success');
      }
    } catch (e) {
      setSnackbarMessage(`Failed to create new card: ${e instanceof Error ? e.message : 'Unknown error'}`);
      setSnackbarSeverity('error');
    }
  };

  const handleSaveCard = async (saveAsNew: boolean = false) => {
    if (!user?.uid || !localEditedCard) return;

    try {
      let savedCard: PromptCard | null = null;
      if (saveAsNew) {
        const newCardData: NewPromptCardData = {
          ...localEditedCard,
          title: saveAsNewTitle || `${localEditedCard.title} (Copy)`,
        };
        savedCard = await addPromptCard(user.uid, newCardData);
      } else {
        savedCard = await updatePromptCard(user.uid, localEditedCard.id, localEditedCard);
      }

      if (savedCard) {
        setActivePromptCard(savedCard); // Update active card to the newly saved/updated version
        setSnackbarMessage('Card saved successfully!');
        setSnackbarSeverity('success');
      }
    } catch (e) {
      setSnackbarMessage(`Failed to save card: ${e instanceof Error ? e.message : 'Unknown error'}`);
      setSnackbarSeverity('error');
    } finally {
      setShowSaveDialog(false);
      setSaveAsNewTitle('');
    }
  };

  const handleRevertCard = () => {
    if (activePromptCard) {
      setLocalEditedCard({ ...activePromptCard });
      setIsCardDirty(false);
      setSnackbarMessage('Changes reverted.');
      setSnackbarSeverity('info');
    }
  };

  const handlePushToLive = () => {
    // "Push to Live" means setting the locally edited version as the active version.
    // This is already handled by setActivePromptCard(localEditedCard)
    // The main distinction here is `isUnapplied` in Android. In React, `localEditedCard`
    // represents the unsaved or un-pushed changes.
    // If we want to "push to live" meaning *use this for the next game*, then we just
    // ensure `activePromptCard` is set to `localEditedCard`.
    if (localEditedCard) {
      setActivePromptCard(localEditedCard);
      setIsCardDirty(false); // If it was dirty, it's now the live version, so it's clean relative to itself
      setSnackbarMessage('Changes applied to live card.');
      setSnackbarSeverity('success');
    }
  };


  const handleDeleteCard = async (cardId: string) => {
    if (!user?.uid) return;
    try {
      await deletePromptCard(user.uid, cardId);
      setSnackbarMessage('Card deleted successfully!');
      setSnackbarSeverity('success');
    } catch (e) {
      setSnackbarMessage(`Failed to delete card: ${e instanceof Error ? e.message : 'Unknown error'}`);
      setSnackbarSeverity('error');
    }
  };

  const handleDuplicateCard = async (cardId: string) => {
    if (!user?.uid) return;
    try {
      const duplicated = await duplicatePromptCard(user.uid, cardId);
      if (duplicated) {
        setSnackbarMessage('Card duplicated successfully!');
        setSnackbarSeverity('success');
      }
    } catch (e) {
      setSnackbarMessage(`Failed to duplicate card: ${e instanceof Error ? e.message : 'Unknown error'}`);
      setSnackbarSeverity('error');
    }
  };

  const handleStartGame = async () => {
    if (!user?.uid || !activePromptCard) {
      setSnackbarMessage('Please select an active prompt card and be logged in to start a game.');
      setSnackbarSeverity('info');
      return;
    }
    if (isCardDirty) {
      setSnackbarMessage('Please save or revert changes before starting a game.');
      setSnackbarSeverity('warning');
      return;
    }
    try {
      await initializeGame(user.uid, activePromptCard.id);
      setSnackbarMessage('Game initialized! Navigating to game screen...');
      setSnackbarSeverity('success');
      // TODO: Add navigation here to GameScreen
      // For now, console log
      console.log("Game started! Navigate to GameScreen.");
    } catch (e) {
      setSnackbarMessage(`Failed to start game: ${e instanceof Error ? e.message : 'Unknown error'}`);
      setSnackbarSeverity('error');
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.uid) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const parsed: NewPromptCardData[] = JSON.parse(content);
        // Assuming the imported JSON is an array of NewPromptCardData
        await importPromptCards(user.uid, parsed);
        setSnackbarMessage(`Successfully imported ${parsed.length} cards!`);
        setSnackbarSeverity('success');
      } catch (err) {
        setSnackbarMessage(`Failed to import cards: ${err instanceof Error ? err.message : 'Invalid JSON'}`);
        setSnackbarSeverity('error');
        console.error("Import error:", err);
      }
    };
    reader.readAsText(file);
  };

  const handleExport = async (cardId: string) => {
    if (!user?.uid) return;
    try {
      const card = await exportPromptCard(user.uid, cardId);
      if (card) {
        const json = JSON.stringify(card, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `prompt_card_${card.title.replace(/\s/g, '_')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setSnackbarMessage(`Card "${card.title}" exported.`);
        setSnackbarSeverity('success');
      }
    } catch (e) {
      setSnackbarMessage(`Failed to export card: ${e instanceof Error ? e.message : 'Unknown error'}`);
      setSnackbarSeverity('error');
    }
  };


  if (isLoading && !promptCards.length) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
        <Typography variant="h6" ml={2}>Loading Prompt Cards...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', p: 2 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" component="h1">
          Prompt Cards
        </Typography>
        <IconButton onClick={onNavToggle} aria-label="menu">
          <MenuIcon />
        </IconButton>
      </Box>

      {/* Game Library & New Card Actions */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        <Button variant="contained" onClick={handleNewCard} startIcon={<AddIcon />}>
          New Card
        </Button>
        <Button variant="outlined" component="label" startIcon={<FileUploadIcon />}>
          Import Cards
          <input type="file" hidden accept=".json" onChange={handleImport} />
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Error: {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden', gap: 2 }}>
        {/* Left Panel: Card List */}
        <Paper elevation={1} sx={{ flex: 1, minWidth: 250, maxWidth: 350, overflowY: 'auto' }}>
          <Typography variant="h6" sx={{ p: 2, pb: 1 }}>Your Cards</Typography>
          <Divider />
          <List>
            {promptCards.length === 0 ? (
              <ListItem>
                <ListItemText primary="No cards yet. Create a new one!" sx={{ textAlign: 'center' }} />
              </ListItem>
            ) : (
              promptCards.map((card) => (
                <ListItem
                  key={card.id}
                  button
                  selected={activePromptCard?.id === card.id}
                  onClick={() => handleCardSelect(card)}
                  sx={{ py: 1, pr: 0 }}
                >
                  <ListItemText
                    primary={card.title}
                    secondary={card.description || 'No description'}
                    primaryTypographyProps={{ noWrap: true }}
                    secondaryTypographyProps={{ noWrap: true }}
                  />
                  <IconButton edge="end" aria-label="duplicate" onClick={(e) => { e.stopPropagation(); handleDuplicateCard(card.id); }}>
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                  <IconButton edge="end" aria-label="delete" onClick={(e) => { e.stopPropagation(); handleDeleteCard(card.id); }}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                  <IconButton edge="end" aria-label="export" onClick={(e) => { e.stopPropagation(); handleExport(card.id); }}>
                    <FileDownloadIcon fontSize="small" />
                  </IconButton>
                </ListItem>
              ))
            )}
          </List>
        </Paper>

        {/* Right Panel: Active Card Editor/Viewer */}
        <Paper elevation={1} sx={{ flex: 2, p: 2, overflowY: 'auto' }}>
          {!activePromptCard || !localEditedCard ? (
            <Box sx={{ textAlign: 'center', mt: 4 }}>
              <Typography variant="h6" color="text.secondary">
                Select a card or create a new one to start editing.
              </Typography>
            </Box>
          ) : (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" component="h2">
                  Active Card: {localEditedCard.title}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {isCardDirty && (
                    <>
                      <Button variant="outlined" onClick={handleRevertCard}>
                        Revert
                      </Button>
                      <Button variant="outlined" onClick={() => setShowSaveDialog(true)}>
                        Save
                      </Button>
                      <Button variant="contained" onClick={handlePushToLive}>
                        Push to Live
                      </Button>
                    </>
                  )}
                  {!isCardDirty && (
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleStartGame}
                      startIcon={<PlayArrowIcon />}
                    >
                      Start Game
                    </Button>
                  )}
                </Box>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <PromptCardEditor
                card={localEditedCard}
                onCardChange={(updatedCard) => {
                  setLocalEditedCard(updatedCard);
                  // Check dirty state against activePromptCard (the "saved" version)
                  setIsCardDirty(JSON.stringify(updatedCard) !== JSON.stringify(activePromptCard));
                }}
                availableConnections={aiConnections}
              />
            </>
          )}
        </Paper>
      </Box>

      {/* Save Dialog */}
      <Dialog open={showSaveDialog} onClose={() => setShowSaveDialog(false)}>
        <DialogTitle>Save Prompt Card</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>How would you like to save this prompt card?</Typography>
          <TextField
            autoFocus
            margin="dense"
            label="Save as New Title (Optional)"
            type="text"
            fullWidth
            variant="outlined"
            value={saveAsNewTitle}
            onChange={(e) => setSaveAsNewTitle(e.target.value)}
            placeholder={`${localEditedCard?.title} (Copy)`}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => handleSaveCard(false)} disabled={!activePromptCard?.id}>Update Original</Button>
          <Button onClick={() => handleSaveCard(true)}>Save as New</Button>
          <Button onClick={() => setShowSaveDialog(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={!!snackbarMessage}
        autoHideDuration={6000}
        onClose={() => setSnackbarMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbarMessage(null)} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PromptCardManager;