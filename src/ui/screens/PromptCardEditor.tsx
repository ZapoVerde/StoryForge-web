// src/ui/screens/PromptCardEditor.tsx
import React from 'react';
import { Box, Divider, FormControlLabel, Switch } from '@mui/material';
import { PromptCard, AiConnection, StackInstructions, AiSettings } from '../../models/index';

// Import the existing modular editors
import { AiSettingsEditor } from '../components/AiSettingsEditor';
import { StackInstructionsEditor } from '../components/StackInstructionsEditor';
import { CollapsibleSection } from '../components/CollapsibleSection';
import { InfoDialog } from '../components/InfoDialog';

// Import the new decomposed parts
import { TitleAndDescriptionEditor } from '../components/promptCardEditorParts/TitleAndDescriptionEditor';
import { CorePromptEditor } from '../components/promptCardEditorParts/CorePromptEditor';
import { FirstTurnEditor } from '../components/promptCardEditorParts/FirstTurnEditor';
import { EmitSkeletonEditor } from '../components/promptCardEditorParts/EmitSkeletonEditor';
import { WorldStateInitEditor } from '../components/promptCardEditorParts/WorldStateInitEditor';
import { GameRulesEditor } from '../components/promptCardEditorParts/GameRulesEditor';
import { FunctionDefsEditor } from '../components/promptCardEditorParts/FunctionDefsEditor';
import { MetadataEditor } from '../components/promptCardEditorParts/MetadataEditor';


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
  // Create specific change handlers for children to call
  const handleFieldChange = (updates: Partial<PromptCard>) => {
    onCardChange({ ...card, ...updates });
  };

  return (
    <Box sx={{ p: 1, pb: 4 }}>
      <TitleAndDescriptionEditor
        title={card.title}
        description={card.description}
        onCardChange={(updates) => handleFieldChange(updates)}
      />

      <CorePromptEditor
        prompt={card.prompt}
        onPromptChange={(prompt) => handleFieldChange({ prompt })}
      />

      <FirstTurnEditor
        firstTurnOnlyBlock={card.firstTurnOnlyBlock}
        onFirstTurnChange={(firstTurnOnlyBlock) => handleFieldChange({ firstTurnOnlyBlock })}
      />

      <EmitSkeletonEditor
        emitSkeleton={card.emitSkeleton}
        onEmitSkeletonChange={(emitSkeleton) => handleFieldChange({ emitSkeleton })}
      />

      <WorldStateInitEditor
        worldStateInit={card.worldStateInit}
        onWorldStateInitChange={(worldStateInit) => handleFieldChange({ worldStateInit })}
      />

      <GameRulesEditor
        gameRules={card.gameRules}
        onGameRulesChange={(gameRules) => handleFieldChange({ gameRules })}
      />

      <AiSettingsEditor
        label="Primary AI Settings"
        settings={card.aiSettings}
        onSettingsChange={(aiSettings) => handleFieldChange({ aiSettings })}
        availableConnections={availableConnections}
      />

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
            label=""
            settings={card.helperAiSettings}
            onSettingsChange={(helperAiSettings) => handleFieldChange({ helperAiSettings })}
            availableConnections={availableConnections}
          />
        </Box>
      </CollapsibleSection>

      <FunctionDefsEditor
        functionDefs={card.functionDefs}
        onFunctionDefsChange={(functionDefs) => handleFieldChange({ functionDefs })}
      />

      <StackInstructionsEditor
        stackInstructions={card.stackInstructions}
        onStackInstructionsChange={(stackInstructions) => handleFieldChange({ stackInstructions })}
      />

      <MetadataEditor
        isPublic={card.isPublic}
        isExample={card.isExample}
        onCardChange={(updates) => handleFieldChange(updates)}
      />
    </Box>
  );
};

export default PromptCardEditor;