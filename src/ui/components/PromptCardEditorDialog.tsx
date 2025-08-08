// src/ui/components/PromptCardEditorDialog.tsx

import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Box, TextField
} from '@mui/material';
import type { PromptCard } from '../../models';
import {
  DEFAULT_EMIT_SKELETON_STRING,
  DEFAULT_FIRST_TURN_PROMPT_BLOCK,
  defaultAiSettingsInCard,
  defaultStackInstructions
} from '../../data/config/promptCardDefaults'; // ✅ Use existing constants instead

import { EmitSkeletonSection } from './PromptCardEditorSections/EmitSkeletonSection.tsx';
import { PromptSection } from './PromptCardEditorSections/PromptSection.tsx';
import { WorldStateInitSection } from './PromptCardEditorSections/WorldStateInitSection.tsx';
import { GameRulesSection } from './PromptCardEditorSections/GameRulesSection.tsx';
import { AiSettingsSection } from './PromptCardEditorSections/AiSettingsSection.tsx';

interface PromptCardEditorDialogProps {
  open: boolean;
  initialCard: PromptCard | null;
  onClose: () => void;
  onSave: (card: PromptCard) => void;
}

// ✅ Local helper: mock default PromptCard (not persisted or valid for storage yet)
const createBlankPromptCard = (): PromptCard => ({
  id: 'temporary-id',
  rootId: 'temporary-id',
  parentId: null,
  ownerId: 'preview',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  title: 'Untitled Card',
  prompt: '',
  description: null,
  firstTurnOnlyBlock: DEFAULT_FIRST_TURN_PROMPT_BLOCK,
  stackInstructions: defaultStackInstructions,
  emitSkeleton: DEFAULT_EMIT_SKELETON_STRING,
  worldStateInit: '',
  gameRules: '',
  aiSettings: { ...defaultAiSettingsInCard },
  helperAiSettings: { ...defaultAiSettingsInCard },
  isHelperAiEnabled: false,
  tags: [],
  isExample: false,
  functionDefs: '',
  isPublic: false,
  contentHash: '',
});

export const PromptCardEditorDialog: React.FC<PromptCardEditorDialogProps> = ({
  open,
  initialCard,
  onClose,
  onSave,
}) => {
  const [card, setCard] = useState<PromptCard>(initialCard || createBlankPromptCard());

  useEffect(() => {
    if (initialCard) {
      setCard(initialCard);
    } else {
      setCard(createBlankPromptCard());
    }
  }, [initialCard]);

  const handleChange = <K extends keyof PromptCard>(key: K, value: PromptCard[K]) => {
    setCard(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onSave(card);
  };

  return (
    <Dialog open={open} onClose={onClose} fullScreen scroll="paper">
      <DialogTitle>{initialCard ? 'Edit Prompt Card' : 'New Prompt Card'}</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            label="Card Title"
            value={card.title}
            onChange={(e) => handleChange('title', e.target.value)}
          />
        </Box>

        <PromptSection prompt={card.prompt} onChange={(v) => handleChange('prompt', v)} />

        <EmitSkeletonSection emitSkeleton={card.emitSkeleton} onChange={(v) => handleChange('emitSkeleton', v)} />

        <WorldStateInitSection worldState={card.worldStateInit} onChange={(v) => handleChange('worldStateInit', v)} />

        <GameRulesSection gameRules={card.gameRules} onChange={(v) => handleChange('gameRules', v)} />

        <AiSettingsSection settings={card.aiSettings} onChange={(v) => handleChange('aiSettings', v)} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained">Save</Button>
      </DialogActions>
    </Dialog>
  );
};
