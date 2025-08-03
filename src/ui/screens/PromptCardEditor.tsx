// src/ui/screens/PromptCardEditor.tsx

import React from 'react';
import {
  Box,
  TextField,
  Checkbox,
  FormControlLabel,
  Grid,
} from '@mui/material';
import { CollapsibleSection } from '../components/CollapsibleSection';
import { AiSettingsEditor } from '../components/AiSettingsEditor';
import { StackInstructionsEditor } from '../components/StackInstructionsEditor';
import { PromptCard, AiConnection, StackInstructions } from '../../models/index';
// Import default values for new cards or resetting
import {
  DEFAULT_FIRST_TURN_PROMPT_BLOCK,
  DEFAULT_EMIT_SKELETON_STRING,
  defaultStackInstructions,
} from '../../data/config/promptCardDefaults';

interface PromptCardEditorProps {
  card: PromptCard;
  onCardChange: (updatedCard: PromptCard) => void;
  availableConnections: AiConnection[];
}

const PromptCardEditor: React.FC<PromptCardEditorProps> = ({
  card,
  onCardChange,
  availableConnections,
}) => {
  // Helper to create a change handler for a specific card property
  const createChangeHandler = <K extends keyof PromptCard>(prop: K) => {
    return (value: PromptCard[K]) => {
      onCardChange({ ...card, [prop]: value });
    };
  };

  const handleAiSettingsChange = (
    settingsKey: 'aiSettings' | 'helperAiSettings',
    updatedSettings: PromptCard['aiSettings']
  ) => {
    onCardChange({ ...card, [settingsKey]: updatedSettings });
  };

  const handleStackInstructionsChange = (updatedInstructions: StackInstructions) => {
    onCardChange({ ...card, stackInstructions: updatedInstructions });
  };

  return (
    <Box sx={{ p: 1, pb: 4 }}>
      {/* Title & Description */}
      <CollapsibleSection title="Title & Description" initiallyExpanded={true}>
        <TextField
          fullWidth
          label="Title"
          value={card.title}
          onChange={(e) => createChangeHandler('title')(e.target.value)}
          sx={{ mb: 2 }}
        />
        <TextField
          fullWidth
          label="Description"
          multiline
          minRows={2}
          value={card.description || ''}
          onChange={(e) => createChangeHandler('description')(e.target.value || null)}
          placeholder="Optional: A short description for this prompt card."
        />
      </CollapsibleSection>

      {/* AI Prompt */}
      <CollapsibleSection title="AI Prompt" initiallyExpanded={true}>
        <TextField
          fullWidth
          multiline
          minRows={5}
          label="Core Scenario / Persona Prompt"
          value={card.prompt}
          onChange={(e) => createChangeHandler('prompt')(e.target.value)}
        />
      </CollapsibleSection>

      {/* First Turn Scene Setup */}
      <CollapsibleSection title="First Turn Scene Setup" initiallyExpanded={false}>
        <TextField
          fullWidth
          multiline
          minRows={4}
          label="Intro scene shown only on turn 1"
          value={card.firstTurnOnlyBlock}
          onChange={(e) => createChangeHandler('firstTurnOnlyBlock')(e.target.value)}
          placeholder={DEFAULT_FIRST_TURN_PROMPT_BLOCK}
        />
      </CollapsibleSection>

      {/* Emit & Tagging Skeleton */}
      <CollapsibleSection title="Emit & Tagging Skeleton" initiallyExpanded={false}>
        <TextField
          fullWidth
          multiline
          minRows={6}
          label="Emit/Tagging Rules (JSON/Text)"
          value={card.emitSkeleton}
          onChange={(e) => createChangeHandler('emitSkeleton')(e.target.value)}
          placeholder={DEFAULT_EMIT_SKELETON_STRING}
        />
      </CollapsibleSection>

      {/* World State Initialization */}
      <CollapsibleSection title="World State Initialization" initiallyExpanded={false}>
        <TextField
          fullWidth
          multiline
          minRows={5}
          label="Initial World State (JSON)"
          value={card.worldStateInit}
          onChange={(e) => createChangeHandler('worldStateInit')(e.target.value)}
          placeholder="{}"
        />
      </CollapsibleSection>

      {/* Game Rules */}
      <CollapsibleSection title="Game Rules Skeleton" initiallyExpanded={false}>
        <TextField
          fullWidth
          multiline
          minRows={5}
          label="Game Rules"
          value={card.gameRules}
          onChange={(e) => createChangeHandler('gameRules')(e.target.value)}
          placeholder="Rules for the AI to follow during gameplay."
        />
      </CollapsibleSection>

      {/* AI Settings */}
      <AiSettingsEditor
        label="Primary AI Settings"
        settings={card.aiSettings}
        onSettingsChange={(s) => handleAiSettingsChange('aiSettings', s)}
        availableConnections={availableConnections}
      />
      <AiSettingsEditor
        label="Helper AI Settings"
        settings={card.helperAiSettings}
        onSettingsChange={(s) => handleAiSettingsChange('helperAiSettings', s)}
        availableConnections={availableConnections}
      />

      {/* Function Definitions */}
      <CollapsibleSection title="Function Definitions" initiallyExpanded={false}>
        <TextField
          fullWidth
          multiline
          minRows={6}
          label="Function Definitions (JSON)"
          value={card.functionDefs}
          onChange={(e) => createChangeHandler('functionDefs')(e.target.value)}
          placeholder="e.g., { 'name': 'action', 'parameters': { ... } }"
        />
      </CollapsibleSection>

      {/* Stack Instructions (with discrete controls) */}
      <StackInstructionsEditor
        stackInstructions={card.stackInstructions}
        onStackInstructionsChange={handleStackInstructionsChange}
      />

      {/* Public/Example Toggles */}
      <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <FormControlLabel
          control={
            <Checkbox
              checked={card.isPublic}
              onChange={(e) => createChangeHandler('isPublic')(e.target.checked)}
            />
          }
          label="Make Public (visible to others)"
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={card.isExample}
              onChange={(e) => createChangeHandler('isExample')(e.target.checked)}
            />
          }
          label="Is Example Card (for showcase)"
        />
      </Box>
    </Box>
  );
};

export default PromptCardEditor;