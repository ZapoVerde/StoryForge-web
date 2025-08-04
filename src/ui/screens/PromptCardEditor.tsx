// src/ui/screens/PromptCardEditor.tsx

import React from 'react';
import {
  Box,
  TextField,
  Checkbox,
  FormControlLabel,
  Grid,
  Switch,
  Divider,
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
  defaultAiSettingsInCard,
} from '../../data/config/promptCardDefaults';
import { InfoDialog } from '../components/InfoDialog'; // NEW: Import InfoDialog

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
          label={
            <>
              Title
              <InfoDialog
                title="Prompt Card Title"
                content="A short, descriptive name for this prompt card. Used for display in the game library and manager."
              />
            </>
          }
          value={card.title}
          onChange={(e) => createChangeHandler('title')(e.target.value)}
          sx={{ mb: 2 }}
        />
        <TextField
          fullWidth
          label={
            <>
              Description
              <InfoDialog
                title="Prompt Card Description"
                content="An optional, longer explanation of what this prompt card is about. It helps you remember the card's purpose and can be seen by others if the card is made public. It is NOT sent to the AI."
              />
            </>
          }
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
          label={
            <>
              Core Scenario / Persona Prompt
              <InfoDialog
                title="Core Scenario / Persona Prompt"
                content="This is the most important part of your prompt card. It defines the core scenario, the AI's persona (e.g., 'You are a wise old wizard...'), the setting, and any foundational rules. This text is ALWAYS sent to the AI."
              />
            </>
          }
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
          label={
            <>
              Intro scene shown only on turn 1
              <InfoDialog
                title="First Turn Only Block"
                content={`This text is added to the AI's prompt ONLY for the very first turn of a new game session using this card. It's ideal for setting an initial scene, asking the player for their first action, or providing specific introductory narrative.
                
Example:
"The camera pans down. It's your first time in this place. Describe the scene and how the world feels from the character's perspective."`}
              />
            </>
          }
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
          label={
            <>
              Emit/Tagging Rules (JSON/Text)
              <InfoDialog
                title="Emit & Tagging Skeleton"
                content={`This section provides the AI with strict rules on how to output structured data (emits, tags, scene changes) as part of its response. It ensures consistency for automated parsing and game state updates.
                
It should contain markdown and specific marker words like @delta, @digest, @scene.

Example Emit:
{
  "+npcs.#fox.trust": 1,
  "=player.#you.weapons.primary.arrows": 47
}

Example Tagging:
- Use # for characters/NPCs (e.g., #goblin)
- Use @ for locations (e.g., @forest)
- Use $ for items (e.g., $sword)`}
              />
            </>
          }
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
          label={
            <>
              Initial World State (JSON)
              <InfoDialog
                title="Initial World State (JSON)"
                content={`A JSON object defining the starting state of your game world. This is loaded once at the beginning of a new game session.
                
It's recommended to use a three-level structure: category.entity.variable.
Categories define broad groups (e.g., 'player', 'npcs', 'locations', 'items').
Entities are specific instances within a category (e.g., '#you', '#goblin_1', '@forest').
Variables are properties of those entities (e.g., 'hp', 'gold', 'status').

Example:
{
  "player": {
    "#you": {
      "hp": 100,
      "gold": 50,
      "inventory": ["$dagger", "$torch"],
      "location": "@forest_edge"
    }
  },
  "npcs": {
    "#goblin_1": {
      "hp": 20,
      "mood": "grumpy",
      "location": "@goblin_camp"
    }
  },
  "locations": {
    "@forest_edge": {
      "description": "A dense forest path.",
      "weather": "sunny"
    }
  }
}`}
              />
            </>
          }
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
          label={
            <>
              Game Rules
              <InfoDialog
                title="Game Rules"
                content="Textual rules or guidelines for the AI to follow throughout the game. This can include combat mechanics, social interaction rules, or narrative conventions. This is always included in the AI prompt."
              />
            </>
          }
          value={card.gameRules}
          onChange={(e) => createChangeHandler('gameRules')(e.target.value)}
          placeholder="Rules for the AI to follow during gameplay."
        />
      </CollapsibleSection>

      {/* Primary AI Settings */}
      <AiSettingsEditor
        label="Primary AI Settings"
        settings={card.aiSettings}
        onSettingsChange={(s) => handleAiSettingsChange('aiSettings', s)}
        availableConnections={availableConnections}
      />

      {/* Helper AI Settings with Toggle */}
      <CollapsibleSection title="Helper AI Settings" initiallyExpanded={false}>
        <FormControlLabel
          control={
            <Switch
              checked={card.isHelperAiEnabled}
              onChange={(e) => createChangeHandler('isHelperAiEnabled')(e.target.checked)}
            />
          }
          label={
            <>
              Enable Helper AI
              <InfoDialog
                title="Enable Helper AI"
                content="Toggle this to enable or disable an additional, secondary AI call for specific tasks (e.g., generating descriptions for new items, character dialog, or resolving complex rules). If disabled, the Helper AI settings below are ignored."
              />
            </>
          }
          sx={{ mb: 2 }}
        />
        <Divider sx={{ mb: 2 }} />
        <Box sx={{ opacity: card.isHelperAiEnabled ? 1 : 0.5, pointerEvents: card.isHelperAiEnabled ? 'auto' : 'none' }}>
          <AiSettingsEditor
            label=""
            settings={card.helperAiSettings}
            onSettingsChange={(s) => handleAiSettingsChange('helperAiSettings', s)}
            availableConnections={availableConnections}
          />
        </Box>
      </CollapsibleSection>

      {/* Function Definitions */}
      <CollapsibleSection title="Function Definitions" initiallyExpanded={false}>
        <TextField
          fullWidth
          multiline
          minRows={6}
          label={
            <>
              Function Definitions (JSON)
              <InfoDialog
                title="Function Definitions"
                content={`Provide JSON schemas for functions the AI can 'call'. This enables the AI to interact with external tools or structured game systems by outputting specific function calls.
                
Example (OpenAI format):
{
  "name": "use_item",
  "description": "Use an item from the player's inventory.",
  "parameters": {
    "type": "object",
    "properties": {
      "item_name": {
        "type": "string",
        "description": "The name of the item to use."
      }
    },
    "required": ["item_name"]
  }
}`}
              />
            </>
          }
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
          label={
            <>
              Make Public (visible to others)
              <InfoDialog
                title="Public Card"
                content="If checked, this prompt card will be visible and potentially usable by other users. Use this for sharing your creations."
              />
            </>
          }
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={card.isExample}
              onChange={(e) => createChangeHandler('isExample')(e.target.checked)}
            />
          }
          label={
            <>
              Is Example Card (for showcase)
              <InfoDialog
                title="Example Card"
                content="Mark this card as an official example. This is usually for built-in, curated content rather than user-generated cards."
              />
            </>
          }
        />
      </Box>
    </Box>
  );
};

export default PromptCardEditor;