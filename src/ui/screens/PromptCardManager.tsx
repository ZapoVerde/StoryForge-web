// src/ui/screens/PromptCardManager.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, Paper, Divider, CircularProgress,
  Alert, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Snackbar,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../state/useAuthStore';
import { usePromptCardStore } from '../../state/usePromptCardStore';
import { useGameStateStore } from '../../state/useGameStateStore';
import { useSettingsStore } from '../../state/useSettingsStore';
import type { PromptCard, NewPromptCardData } from '../../models';
import {
  defaultStackInstructions, defaultAiSettingsInCard,
  DEFAULT_FIRST_TURN_PROMPT_BLOCK, DEFAULT_EMIT_SKELETON_STRING,
} from '../../data/config/promptCardDefaults';
import PromptCardEditor from './PromptCardEditor';
import { PromptCardList } from '../components/PromptCardList';

const PromptCardManager: React.FC = () => {
  // --- Start of Co-located Logic (from the old usePromptCardManagerLogic hook) ---
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const {
    promptCards, activePromptCard, isLoading, error, fetchPromptCards, setActivePromptCard,
    addPromptCard, updatePromptCard, duplicatePromptCard, deletePromptCard,
    importPromptCards, exportPromptCard,
  } = usePromptCardStore();

  const { initializeGame } = useGameStateStore();
  const { aiConnections, fetchAiConnections } = useSettingsStore();

  const [localEditedCard, setLocalEditedCard] = useState<PromptCard | null>(null);
  const [isCardDirty, setIsCardDirty] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveAsNewTitle, setSaveAsNewTitle] = useState('');
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }>({ open: false, message: '', severity: 'info' });

  useEffect(() => {
    if (user?.uid) { // FIX: Use user.uid
      fetchPromptCards(user.uid);
      fetchAiConnections(user.uid);
    }
  }, [user?.uid, fetchPromptCards, fetchAiConnections]);

  useEffect(() => {
    setLocalEditedCard(activePromptCard ? { ...activePromptCard } : null);
    setIsCardDirty(false);
  }, [activePromptCard]);

  const showSnackbar = useCallback((message: string, severity: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const handleCardSelect = useCallback((card: PromptCard) => {
    if (isCardDirty) {
      if (window.confirm('You have unsaved changes that will be lost. Are you sure you want to switch?')) {
        setActivePromptCard(card);
      }
    } else {
      setActivePromptCard(card);
    }
  }, [isCardDirty, setActivePromptCard]);

  const handleLocalCardChange = useCallback((updatedCard: PromptCard) => {
    setLocalEditedCard(updatedCard);
    setIsCardDirty(JSON.stringify(updatedCard) !== JSON.stringify(activePromptCard));
  }, [activePromptCard]);

  const handleSaveCard = useCallback(async (saveAsNew: boolean = false) => {
    if (!user?.uid || !localEditedCard) return; // FIX: Use user.uid
    try {
      let savedCard: PromptCard | null = null;
      if (saveAsNew) {
        const newCardData: NewPromptCardData = { ...localEditedCard, title: saveAsNewTitle || `${localEditedCard.title} (Copy)` };
        savedCard = await addPromptCard(user.uid, newCardData); // FIX: Use correct action name
      } else {
        savedCard = await updatePromptCard(user.uid, localEditedCard.id, localEditedCard);
      }
      if (savedCard) {
        setActivePromptCard(savedCard);
        showSnackbar('Card saved successfully!', 'success');
      }
    } catch (e) {
      showSnackbar(`Failed to save card: ${e instanceof Error ? e.message : 'Unknown error'}`, 'error');
    } finally {
      setShowSaveDialog(false);
      setSaveAsNewTitle('');
    }
  }, [user?.uid, localEditedCard, saveAsNewTitle, addPromptCard, updatePromptCard, setActivePromptCard, showSnackbar]);

  const handleRevert = useCallback(() => {
    if (activePromptCard) {
      setLocalEditedCard({ ...activePromptCard });
      setIsCardDirty(false);
      showSnackbar('Changes reverted.', 'info');
    }
  }, [activePromptCard, showSnackbar]);

  const handleNewCard = useCallback(async () => {
    if (!user?.uid) return; // FIX: Use user.uid
    const defaultConnectionId = aiConnections.length > 0 ? aiConnections[0].id : "";
    const newCardData: NewPromptCardData = {
      title: "New Untitled Card", prompt: "A new adventure begins...",
      description: null, firstTurnOnlyBlock: DEFAULT_FIRST_TURN_PROMPT_BLOCK,
      stackInstructions: defaultStackInstructions, emitSkeleton: DEFAULT_EMIT_SKELETON_STRING,
      worldStateInit: '{}', gameRules: '',
      aiSettings: { ...defaultAiSettingsInCard, selectedConnectionId: defaultConnectionId },
      helperAiSettings: { ...defaultAiSettingsInCard, selectedConnectionId: defaultConnectionId },
      isHelperAiEnabled: false, tags: [], isExample: false, functionDefs: '', isPublic: false,
    };
    const createdCard = await addPromptCard(user.uid, newCardData); // FIX: Use correct action name
    if (createdCard) {
      setActivePromptCard(createdCard);
      showSnackbar('New card created!', 'success');
    }
  }, [user?.uid, aiConnections, addPromptCard, setActivePromptCard, showSnackbar]);
  
  const handleDeleteCard = useCallback(async (cardId: string) => {
    if (!user?.uid || !window.confirm("Are you sure you want to delete this card forever?")) return; // FIX: Use user.uid
    await deletePromptCard(user.uid, cardId);
    showSnackbar('Card deleted.', 'success');
  }, [user?.uid, deletePromptCard, showSnackbar]);

  const handleDuplicateCard = useCallback(async (cardId: string) => {
    if (!user?.uid) return; // FIX: Use user.uid
    await duplicatePromptCard(user.uid, cardId);
    showSnackbar('Card duplicated!', 'success');
  }, [user?.uid, duplicatePromptCard, showSnackbar]);

  const handleImport = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !user?.uid) return; // FIX: Use user.uid
    try {
      const allCards: NewPromptCardData[] = [];
      for (const file of files) {
        const content = await file.text();
        const parsed = JSON.parse(content);
        allCards.push(...(Array.isArray(parsed) ? parsed : [parsed]));
      }
      await importPromptCards(user.uid, allCards);
      showSnackbar(`Successfully imported ${allCards.length} card(s)!`, 'success');
    } catch (err) {
      showSnackbar(`Import failed: ${err instanceof Error ? err.message : 'Invalid JSON'}`, 'error');
    }
    event.target.value = '';
  }, [user?.uid, importPromptCards, showSnackbar]);

  const handleExport = useCallback(async (cardId: string) => {
    if (!user?.uid) return; // FIX: Use user.uid
    const card = await exportPromptCard(user.uid, cardId);
    if (card) {
      const blob = new Blob([JSON.stringify(card, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `prompt_card_${card.title.replace(/\s/g, '_')}.json`;
      a.click();
      URL.revokeObjectURL(url);
      a.remove();
      showSnackbar(`Exported "${card.title}".`, 'success');
    }
  }, [user?.uid, exportPromptCard, showSnackbar]);

  const handleStartGame = useCallback(async () => {
    if (!user?.uid || !activePromptCard) return; // FIX: Use user.uid
    if (isCardDirty) { showSnackbar('Please save changes before starting a game.', 'warning'); return; }
    await initializeGame(user.uid, activePromptCard.id);
    navigate('/game');
  }, [user?.uid, activePromptCard, isCardDirty, initializeGame, navigate, showSnackbar]);
  
  // --- End of Co-located Logic ---

  if (isLoading && !promptCards.length) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress /><Typography variant="h6" ml={2}>Loading Prompt Cards...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" component="h1">Prompt Cards Manager</Typography>
      </Box>
      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        <Button variant="contained" onClick={handleNewCard} startIcon={<AddIcon />}>New Card</Button>
        <Button variant="outlined" component="label" startIcon={<FileUploadIcon />}>
          Import Card(s)<input type="file" hidden accept=".json" onChange={handleImport} multiple/>
        </Button>
      </Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden', gap: 2 }}>
        <Paper elevation={1} sx={{ flex: 1, minWidth: 250, maxWidth: 400, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {/* FIX: Use the new PromptCardList component */}
          <PromptCardList
            cards={promptCards}
            activeCardId={activePromptCard?.id || null}
            onSelectCard={handleCardSelect}
            onDeleteCard={handleDeleteCard}
            onDuplicateCard={handleDuplicateCard}
            onExportCard={handleExport}
          />
        </Paper>
        <Paper elevation={1} sx={{ flex: 2, minWidth: 400, overflowY: 'auto' }}>
          {!localEditedCard ? (
            <Box sx={{ textAlign: 'center', p: 4, mt: 4 }}>
              <Typography variant="h6" color="text.secondary">Select a card or create a new one.</Typography>
            </Box>
          ) : (
            <>
              <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', position: 'sticky', top: 0, backgroundColor: 'background.paper', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">{localEditedCard.title}</Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {isCardDirty && (<>
                    <Button variant="outlined" onClick={handleRevert}>Revert</Button>
                    <Button variant="contained" onClick={() => handleSaveCard(false)}>Save</Button>
                  </>)}
                  <Button variant="outlined" onClick={() => setShowSaveDialog(true)}>Save As...</Button>
                  <Button variant="contained" color="primary" onClick={handleStartGame} startIcon={<PlayArrowIcon />} disabled={isCardDirty}>Start Game</Button>
                </Box>
              </Box>
              <PromptCardEditor card={localEditedCard} onCardChange={handleLocalCardChange} availableConnections={aiConnections} />
            </>
          )}
        </Paper>
      </Box>
      <Dialog open={showSaveDialog} onClose={() => setShowSaveDialog(false)}>
        <DialogTitle>Save As New Card</DialogTitle>
        <DialogContent><TextField autoFocus margin="dense" label="New Title" type="text" fullWidth variant="outlined" value={saveAsNewTitle} onChange={(e) => setSaveAsNewTitle(e.target.value)} placeholder={`${localEditedCard?.title} (Copy)`} /></DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSaveDialog(false)}>Cancel</Button>
          <Button onClick={() => handleSaveCard(true)}>Save</Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar(prev => ({...prev, open: false}))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setSnackbar(prev => ({...prev, open: false}))} severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default PromptCardManager;