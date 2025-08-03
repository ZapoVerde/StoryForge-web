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
import { useNavigate } from 'react-router-dom'; // Import useNavigate

import { usePromptCardStore } from '../../state/usePromptCardStore';
import { useAuthStore } from '../../state/useAuthStore';
import { useGameStateStore } from '../../state/useGameStateStore';
import { useSettingsStore } from '../../state/useSettingsStore'; // Import useSettingsStore to pass AI connections
import { PromptCard, NewPromptCardData } from '../../models/index';
import PromptCardEditor from './PromptCardEditor'; // Editor component

interface PromptCardManagerProps {
  onNavToggle: () => void;
}

const PromptCardManager: React.FC<PromptCardManagerProps> = ({ onNavToggle }) => {
  const navigate = useNavigate();
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
    importPromptCards,
    exportPromptCard,
  } = usePromptCardStore();
  const { initializeGame } = useGameStateStore();
  const { aiConnections, fetchAiConnections } = useSettingsStore(); // Get aiConnections from settings store

  const [localEditedCard, setLocalEditedCard] = useState<PromptCard | null>(null);
  const [isCardDirty, setIsCardDirty] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveAsNewTitle, setSaveAsNewTitle] = useState('');
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false); // Controlled open state for Snackbar
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info' | 'warning'>('info');

  useEffect(() => {
    if (user?.uid) {
      fetchPromptCards(user.uid);
      fetchAiConnections(user.uid); // Fetch AI connections here
    }
  }, [user?.uid, fetchPromptCards, fetchAiConnections]); // Depend on fetchAiConnections

  useEffect(() => {
    // Sync localEditedCard with activePromptCard
    setLocalEditedCard(activePromptCard ? { ...activePromptCard } : null);
    setIsCardDirty(false); // Reset dirty state when active card changes
  }, [activePromptCard]);

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const handleSnackbarClose = (event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  };


  const handleCardSelect = (card: PromptCard) => {
    if (isCardDirty) {
      // Potentially warn user about unsaved changes
      showSnackbar('Unsaved changes will be lost if you switch cards.', 'warning');
      // For now, proceed directly, but a confirmation dialog could be added here.
    }
    setActivePromptCard(card);
  };

  const handleNewCard = async () => {
    if (!user?.uid) {
      showSnackbar('Must be logged in to create a new card.', 'error');
      return;
    }
    // Pre-select the default AI connection if available
    const defaultConnectionId = aiConnections.length > 0 ? aiConnections[0].id : "";

    const newCardData: NewPromptCardData = {
      title: "New Prompt Card",
      prompt: "This is a new prompt card. Describe the setting and your character's starting situation.",
      aiSettings: {
        selectedConnectionId: defaultConnectionId,
        temperature: 0.7, topP: 1.0, maxTokens: 2048, presencePenalty: 0.0, frequencyPenalty: 0.0, functionCallingEnabled: false
      },
      helperAiSettings: {
        selectedConnectionId: defaultConnectionId,
        temperature: 0.7, topP: 1.0, maxTokens: 2048, presencePenalty: 0.0, frequencyPenalty: 0.0, functionCallingEnabled: false
      }
    };
    try {
      const createdCard = await addPromptCard(user.uid, newCardData);
      if (createdCard) {
        setActivePromptCard(createdCard);
        showSnackbar('New card created successfully!', 'success');
      }
    } catch (e) {
      showSnackbar(`Failed to create new card: ${e instanceof Error ? e.message : 'Unknown error'}`, 'error');
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
          // Explicitly clear ID, timestamps, ownerId, and lineage for a truly new copy
          // These will be regenerated by `addPromptCard`
          id: '',
          rootId: '',
          parentId: null,
          createdAt: '',
          updatedAt: '',
          ownerId: user.uid, // Ensure new owner is current user
          isExample: false, // New copies are user-owned, not examples
          isPublic: false, // New copies are private by default
        };
        savedCard = await addPromptCard(user.uid, newCardData);
      } else {
        savedCard = await updatePromptCard(user.uid, localEditedCard.id, localEditedCard);
      }

      if (savedCard) {
        setActivePromptCard(savedCard); // Update active card to the newly saved/updated version
        showSnackbar('Card saved successfully!', 'success');
      }
    } catch (e) {
      showSnackbar(`Failed to save card: ${e instanceof Error ? e.message : 'Unknown error'}`, 'error');
    } finally {
      setShowSaveDialog(false);
      setSaveAsNewTitle('');
    }
  };

  const handleRevertCard = () => {
    if (activePromptCard) {
      setLocalEditedCard({ ...activePromptCard });
      setIsCardDirty(false);
      showSnackbar('Changes reverted.', 'info');
    }
  };

  const handlePushToLive = () => {
    // "Push to Live" simply means ensuring the currently displayed/edited card
    // is the one set as the `activePromptCard` in the store.
    // If localEditedCard is different from activePromptCard in the store,
    // this action effectively "applies" the changes to the active card without saving to DB.
    // Saving to DB is a separate step.
    if (localEditedCard && activePromptCard?.id !== localEditedCard.id) {
        // If they are editing a *different* card, setting it as active would switch context.
        // This is usually implied by selecting from the left list.
        // The "Push to Live" button generally means, "apply these *current edits*
        // to the *currently active card* (which might be in the store as `activePromptCard`).
        // It's more about local state consistency than DB save.
        // Given the dirty state logic, this button would appear when `localEditedCard`
        // is different from `activePromptCard`.
        setActivePromptCard(localEditedCard);
        setIsCardDirty(false);
        showSnackbar('Changes applied to live editor view.', 'success');
    } else if (localEditedCard && isCardDirty) {
        // If it's the same card but dirty, just re-set it to mark it as clean (for the store's perspective)
        // A save operation would typically make it non-dirty. This button might be redundant if
        // the intent is always to save. Let's make it explicitly save as well to avoid confusion.
        // Or, rename this button to "Save Changes" and remove `handleSaveCard(false)`
        handleSaveCard(false); // Now "Push to Live" also saves
    }
  };


  const handleDeleteCard = async (cardId: string) => {
    if (!user?.uid) return;
    try {
      await deletePromptCard(user.uid, cardId);
      showSnackbar('Card deleted successfully!', 'success');
    } catch (e) {
      showSnackbar(`Failed to delete card: ${e instanceof Error ? e.message : 'Unknown error'}`, 'error');
    }
  };

  const handleDuplicateCard = async (cardId: string) => {
    if (!user?.uid) return;
    try {
      const duplicated = await duplicatePromptCard(user.uid, cardId);
      if (duplicated) {
        showSnackbar('Card duplicated successfully!', 'success');
      }
    } catch (e) {
      showSnackbar(`Failed to duplicate card: ${e instanceof Error ? e.message : 'Unknown error'}`, 'error');
    }
  };

  const handleStartGame = async () => {
    if (!user?.uid || !activePromptCard) {
      showSnackbar('Please select an active prompt card and be logged in to start a game.', 'info');
      return;
    }
    if (isCardDirty) {
      showSnackbar('Please save or revert changes before starting a game.', 'warning');
      return;
    }
    try {
      await initializeGame(user.uid, activePromptCard.id);
      showSnackbar('Game initialized! Navigating to game screen...', 'success');
      navigate('/game'); // Navigate to GameScreen
    }
    catch (e) {
      showSnackbar(`Failed to start game: ${e instanceof Error ? e.message : 'Unknown error'}`, 'error');
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.uid) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        // Check if it's a single object or an array
        let parsed: NewPromptCardData | NewPromptCardData[];
        try {
            parsed = JSON.parse(content);
        } catch (parseError) {
            showSnackbar('Invalid JSON format in file.', 'error');
            return;
        }

        const cardsToImport: NewPromptCardData[] = Array.isArray(parsed) ? parsed : [parsed];

        await importPromptCards(user.uid, cardsToImport);
        showSnackbar(`Successfully imported ${cardsToImport.length} cards!`, 'success');
      } catch (err) {
        showSnackbar(`Failed to import cards: ${err instanceof Error ? err.message : 'Invalid JSON'}`, 'error');
        console.error("Import error:", err);
      } finally {
        // Clear the file input
        event.target.value = '';
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
        showSnackbar(`Card "${card.title}" exported.`, 'success');
      }
    } catch (e) {
      showSnackbar(`Failed to export card: ${e instanceof Error ? e.message : 'Unknown error'}`, 'error');
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
                      {/* The "Push to Live" button becomes more like an immediate save if changes are dirty */}
                      {/* If the intent is just to apply without saving, this needs careful state management */}
                      <Button variant="contained" onClick={() => handleSaveCard(false)}> {/* Now directly saves */}
                        Apply Changes
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
                  // Use content hash for robust dirty checking
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
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PromptCardManager;