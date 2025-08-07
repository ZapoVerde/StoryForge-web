// src/utils/hooks/usePromptCardManagerLogic.ts
import { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import { usePromptCardStore } from '../../state/usePromptCardStore';
import { useGameStateStore } from '../../state/useGameStateStore';
import { useSettingsStore } from '../../state/useSettingsStore';
import type { PromptCard, NewPromptCardData } from '../../models';
import {
  defaultStackInstructions,
  defaultAiSettingsInCard,
  DEFAULT_FIRST_TURN_PROMPT_BLOCK,
  DEFAULT_EMIT_SKELETON_STRING,
} from '../../data/config/promptCardDefaults';
import { useNavigate } from 'react-router-dom';

export const usePromptCardManagerLogic = (user: User | null) => {
  const navigate = useNavigate();

  // 1. All state and store hooks are moved here
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
  const { aiConnections, fetchAiConnections } = useSettingsStore();

  const [localEditedCard, setLocalEditedCard] = useState<PromptCard | null>(null);
  const [isCardDirty, setIsCardDirty] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveAsNewTitle, setSaveAsNewTitle] = useState('');
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }>({ open: false, message: '', severity: 'info' });

  // 2. All useEffects are moved here
  useEffect(() => {
    if (user?.uid) {
      fetchPromptCards(user.uid);
      fetchAiConnections(user.uid);
    }
  }, [user?.uid, fetchPromptCards, fetchAiConnections]);

  useEffect(() => {
    setLocalEditedCard(activePromptCard ? { ...activePromptCard } : null);
    setIsCardDirty(false);
  }, [activePromptCard]);

  // 3. All handler functions are moved here and wrapped in useCallback
  const showSnackbar = useCallback((message: string, severity: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const handleCardSelect = useCallback((card: PromptCard) => {
    if (isCardDirty) {
      showSnackbar('Unsaved changes will be lost if you switch cards.', 'warning');
    }
    setActivePromptCard(card);
  }, [isCardDirty, setActivePromptCard, showSnackbar]);

  const handleLocalCardChange = useCallback((updatedCard: PromptCard) => {
    setLocalEditedCard(updatedCard);
    setIsCardDirty(JSON.stringify(updatedCard) !== JSON.stringify(activePromptCard));
  }, [activePromptCard]);

  const handleSaveCard = useCallback(async (saveAsNew: boolean = false) => {
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
        setActivePromptCard(savedCard);
        showSnackbar('Card saved successfully!', 'success');
      }
    } catch (e) {
      showSnackbar(`Failed to save card: ${e instanceof Error ? e.message : 'Unknown error'}`, 'error');
    } finally {
      setShowSaveDialog(false);
      setSaveAsNewTitle('');
    }
  }, [user, localEditedCard, saveAsNewTitle, addPromptCard, updatePromptCard, setActivePromptCard, showSnackbar]);

  const handleRevert = useCallback(() => {
    if (activePromptCard) {
      setLocalEditedCard({ ...activePromptCard });
      setIsCardDirty(false);
      showSnackbar('Changes reverted.', 'info');
    }
  }, [activePromptCard, showSnackbar]);

  const handleNewCard = useCallback(async () => {
    if (!user?.uid) {
      showSnackbar('Must be logged in to create a new card.', 'error');
      return;
    }
    const defaultConnectionId = aiConnections.length > 0 ? aiConnections[0].id : "";
    const newCardData: NewPromptCardData = {
      title: "New Prompt Card",
      prompt: "This is a new prompt card. Describe the setting and your character's starting situation.",
      description: null,
      firstTurnOnlyBlock: DEFAULT_FIRST_TURN_PROMPT_BLOCK,
      stackInstructions: defaultStackInstructions,
      emitSkeleton: DEFAULT_EMIT_SKELETON_STRING,
      worldStateInit: '',
      gameRules: '',
      aiSettings: { ...defaultAiSettingsInCard, selectedConnectionId: defaultConnectionId },
      helperAiSettings: { ...defaultAiSettingsInCard, selectedConnectionId: defaultConnectionId },
      isHelperAiEnabled: false,
      tags: [],
      isExample: false,
      functionDefs: '',
      isPublic: false,
    };
    const createdCard = await addPromptCard(user.uid, newCardData);
    if (createdCard) {
      setActivePromptCard(createdCard);
      showSnackbar('New card created successfully!', 'success');
    }
  }, [user, aiConnections, addPromptCard, setActivePromptCard, showSnackbar]);

  const handleDeleteCard = useCallback(async (cardId: string) => {
    if (!user?.uid) return;
    await deletePromptCard(user.uid, cardId);
    showSnackbar('Card deleted successfully!', 'success');
  }, [user, deletePromptCard, showSnackbar]);

  const handleDuplicateCard = useCallback(async (cardId: string) => {
    if (!user?.uid) return;
    const duplicated = await duplicatePromptCard(user.uid, cardId);
    if (duplicated) {
      showSnackbar('Card duplicated successfully!', 'success');
    }
  }, [user, duplicatePromptCard, showSnackbar]);

  const handleImport = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.uid) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content) as NewPromptCardData | NewPromptCardData[];
        const cardsToImport = Array.isArray(parsed) ? parsed : [parsed];
        await importPromptCards(user.uid, cardsToImport);
        showSnackbar(`Successfully imported ${cardsToImport.length} cards!`, 'success');
      } catch (err) {
        showSnackbar(`Failed to import cards: ${err instanceof Error ? err.message : 'Invalid JSON'}`, 'error');
      }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset file input
  }, [user, importPromptCards, showSnackbar]);

  const handleExport = useCallback(async (cardId: string) => {
    if (!user?.uid) return;
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
  }, [user, exportPromptCard, showSnackbar]);

  const handleStartGame = useCallback(async () => {
    if (!user?.uid || !activePromptCard) return;
    if (isCardDirty) {
      showSnackbar('Please save changes before starting a game.', 'warning');
      return;
    }
    await initializeGame(user.uid, activePromptCard.id);
    navigate('/game');
  }, [user, activePromptCard, isCardDirty, initializeGame, navigate, showSnackbar]);

  // 4. Return a clean API for the component
  return {
    // State for Rendering
    isLoading,
    error,
    promptCards,
    activePromptCard,
    localEditedCard,
    isCardDirty,
    aiConnections,
    saveDialog: {
      open: showSaveDialog,
      title: saveAsNewTitle
    },
    snackbar,

    // Functions for Event Handlers
    handleCardSelect,
    handleLocalCardChange,
    handleSaveCard,
    handleRevert,
    handleNewCard,
    handleDeleteCard,
    handleDuplicateCard,
    handleImport,
    handleExport,
    handleStartGame,
    setSaveDialog: setShowSaveDialog,
    setSaveAsNewTitle,
    closeSnackbar: () => setSnackbar(prev => ({ ...prev, open: false })),
  };
};