// src/ui/screens/PromptCardEditor.tsx
import React from 'react';
import { Box, Divider, FormControlLabel, Switch, TextField } from '@mui/material';
import type { PromptCard, AiConnection } from '../../models';

// Import the more complex, reusable editor components
import { AiSettingsEditor } from '../components/AiSettingsEditor';
import { StackInstructionsEditor } from '../components/StackInstructionsEditor';
import { CollapsibleSection } from '../components/CollapsibleSection';
import { InfoDialog } from '../components/InfoDialog';

// Import constants for placeholders
import {
  DEFAULT_FIRST_TURN_PROMPT_BLOCK,
  DEFAULT_EMIT_SKELETON_STRING,
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
  // A single handler to update the parent component's state
  const handleFieldChange = (updates: Partial<PromptCard>) => {
    onCardChange({ ...card, ...updates });
  };

  return (
    <Box sx={{ p: 2, pb: 4 }}>
      {/* --- Title & Description Section (Merged) --- */}
      <CollapsibleSection title="Title & Description" initiallyExpanded={true}>
        <TextField
          fullWidth
          label="Title"
          value={card.title}
          onChange={(e) => handleFieldChange({ title: e.target.value })}
          sx={{ mb: 2 }}
        />
        <TextField
          fullWidth
          label="Description"
          multiline
          minRows={2}
          value={card.description || ''}
          onChange={(e) => handleFieldChange({ description: e.target.value || null })}
          placeholder="Optional: A short description for this card (not sent to AI)."
        />
      </CollapsibleSection>

      {/* --- Core Prompt Section (Merged) --- */}
      <CollapsibleSection title="AI Prompt" initiallyExpanded={true}>
        <TextField
          fullWidth
          multiline
          minRows={5}
          label="Core Scenario / Persona Prompt"
          value={card.prompt}
          onChange={(e) => handleFieldChange({ prompt: e.target.value })}
        />
      </CollapsibleSection>

      {/* --- First Turn Section (Merged) --- */}
      <CollapsibleSection title="First Turn Scene Setup" initiallyExpanded={false}>
        <TextField
          fullWidth
          multiline
          minRows={4}
          label="Intro scene shown only on turn 1"
          value={card.firstTurnOnlyBlock}
          onChange={(e) => handleFieldChange({ firstTurnOnlyBlock: e.target.value })}
          placeholder={DEFAULT_FIRST_TURN_PROMPT_BLOCK}
        />
      </CollapsibleSection>

      {/* --- Emit Skeleton Section (Merged) --- */}
      <CollapsibleSection title="Emit & Tagging Skeleton" initiallyExpanded={false}>
        <TextField
          fullWidth
          multiline
          minRows={6}
          label="AI Output Structure & Rules"
          value={card.emitSkeleton}
          onChange={(e) => handleFieldChange({ emitSkeleton: e.target.value })}
          placeholder={DEFAULT_EMIT_SKELETON_STRING}
        />
      </CollapsibleSection>

      {/* --- World State Init Section (Merged) --- */}
      <CollapsibleSection title="World State Initialization" initiallyExpanded={false}>
        <TextField
          fullWidth
          multiline
          minRows={5}
          label="Initial World State (JSON)"
          value={card.worldStateInit}
          onChange={(e) => handleFieldChange({ worldStateInit: e.target.value })}
          placeholder="{}"
        />
      </CollapsibleSection>

      {/* --- Game Rules Section (Merged) --- */}
      <CollapsibleSection title="Game Rules Skeleton" initiallyExpanded={false}>
        <TextField
          fullWidth
          multiline
          minRows={5}
          label="Game Rules"
          value={card.gameRules}
          onChange={(e) => handleFieldChange({ gameRules: e.target.value })}
          placeholder="Rules for the AI to follow during gameplay."
        />
      </CollapsibleSection>

      {/* --- AI Settings Section (Uses Reusable Component) --- */}
      <AiSettingsEditor
        label="Primary AI Settings"
        settings={card.aiSettings}
        onSettingsChange={(aiSettings) => handleFieldChange({ aiSettings })}
        availableConnections={availableConnections}
      />

      {/* --- Helper AI Settings Section (Uses Reusable Component) --- */}
      <CollapsibleSection title="Helper AI Settings" initiallyExpanded={false}>
        <FormControlLabel
          control={
            <Switch
              checked={card.isHelperAiEnabled}
              onChange={(e) => handleFieldChange({ isHelperAiEnabled: e.target.checked })}
            />
          }
          label={<>Enable Helper AI <InfoDialog title="Enable Helper AI" content="Toggle to enable a secondary AI call for specific tasks."/></>}
          sx={{ mb: 2 }}
        />
        <Divider sx={{ mb: 2 }} />
        <Box sx={{ opacity: card.isHelperAiEnabled ? 1 : 0.5, pointerEvents: card.isHelperAiEnabled ? 'auto' : 'none' }}>
          <AiSettingsEditor
            label="" // No label for the nested editor
            settings={card.helperAiSettings}
            onSettingsChange={(helperAiSettings) => handleFieldChange({ helperAiSettings })}
            availableConnections={availableConnections}
          />
        </Box>
      </CollapsibleSection>
      
      {/* --- Function Definitions Section (Merged) --- */}
      <CollapsibleSection title="Function Definitions" initiallyExpanded={false}>
        <TextField
          fullWidth
          multiline
          minRows={6}
          label="Function Definitions (JSON)"
          value={card.functionDefs}
          onChange={(e) => handleFieldChange({ functionDefs: e.target.value })}
          placeholder="e.g., { 'name': 'action', 'parameters': { ... } }"
        />
      </CollapsibleSection>

      {/* --- Stack Instructions Section (Uses Reusable Component) --- */}
      <StackInstructionsEditor
        stackInstructions={card.stackInstructions}
        onStackInstructionsChange={(stackInstructions) => handleFieldChange({ stackInstructions })}
      />

      {/* --- Metadata Section (Merged) --- */}
       <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <FormControlLabel
          control={
            <Switch
              checked={card.isPublic}
              onChange={(e) => handleFieldChange({ isPublic: e.target.checked })}
            />
          }
          label="Make Public (visible to others)"
        />
        <FormControlLabel
          control={
            <Switch
              checked={card.isExample}
              onChange={(e) => handleFieldChange({ isExample: e.target.checked })}
            />
          }
          label="Is Example Card (for showcase)"
        />
      </Box>
    </Box>
  );
};

export default PromptCardEditor;