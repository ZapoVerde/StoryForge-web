// src/ui/components/StackInstructionsEditor.tsx
import React from 'react';
import { Box, Typography, Divider, Checkbox, FormControlLabel, TextField } from '@mui/material';
import { CollapsibleSection } from './CollapsibleSection';
import { InfoDialog } from './InfoDialog';
import { StackInstructions, ProsePolicy, DigestFilterPolicy, TokenPolicy, EmissionRule } from '../../models';

// Import the new, smaller components
import { PolicyEditor } from './stackInstructions/PolicyEditor';
import { DigestPolicyEditor } from './stackInstructions/DigestPolicyEditor';
import { TokenPolicyEditor } from './stackInstructions/TokenPolicyEditor';

interface StackInstructionsEditorProps {
  stackInstructions: StackInstructions;
  onStackInstructionsChange: (updatedInstructions: StackInstructions) => void;
}

const StackInstructionsEditor: React.FC<StackInstructionsEditorProps> = ({
  stackInstructions,
  onStackInstructionsChange,
}) => {
  // Generic handler to update a top-level policy object in the main state
  const handlePolicyChange = (
    policyKey: keyof StackInstructions,
    value: ProsePolicy | DigestFilterPolicy | TokenPolicy | Record<number, EmissionRule> | boolean | number
  ) => {
    onStackInstructionsChange({
      ...stackInstructions,
      [policyKey]: value,
    });
  };

  return (
    <CollapsibleSection title="🧠 Stack Instructions" initiallyExpanded={false}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="body2" color="text.secondary">
          These settings control how previous game information (the 'context stack') is assembled
          and presented to the AI for each new turn.
          <InfoDialog
            title="Understanding the Context Stack"
            content={`The AI's 'memory' for each turn is built from a 'context stack'. The order and content of this stack significantly impact AI responses. Each section below can be individually enabled/disabled.`}
          />
        </Typography>
      </Box>

      {/* -- Use the new PolicyEditor for repeating patterns -- */}
      <PolicyEditor
        title="Narrator Prose Emission"
        policy={stackInstructions.narratorProseEmission}
        onPolicyChange={(p) => handlePolicyChange('narratorProseEmission', p)}
        infoContent={{
          main: "Controls how past narrator output (the main story text) is included in the AI's context.",
          mode: "- ALWAYS: Include all past narrator prose.\n- FIRST_N: Include prose only from the first 'N' turns.\n- AFTER_N: Include prose only from turns after 'N'.\n- NEVER: Do not include any past narrator prose.",
          filtering: "- NONE: Include all prose based on the selected mode.\n- SCENE_ONLY: Only include prose relevant to the current scene.\n- TAGGED: Only include prose that contains any recognized tags."
        }}
      />

      <Divider sx={{ my: 3 }} />

      {/* -- Use the new DigestPolicyEditor -- */}
      <DigestPolicyEditor
        digestPolicy={stackInstructions.digestPolicy}
        digestEmission={stackInstructions.digestEmission}
        onPolicyChange={(p) => handlePolicyChange('digestPolicy', p)}
        onEmissionChange={(e) => handlePolicyChange('digestEmission', e)}
      />

      <Divider sx={{ my: 3 }} />

      {/* -- Expression Log is another ProsePolicy, so reuse PolicyEditor -- */}
      <PolicyEditor
        title="Expression Log Policy"
        policy={stackInstructions.expressionLogPolicy}
        onPolicyChange={(p) => handlePolicyChange('expressionLogPolicy', p)}
        infoContent={{
          main: "Controls how character 'expression' (portions of past narrator prose related to character actions/emotions) is included.",
          mode: "Controls when expression logs are included (Always, First N turns, etc.).",
          filtering: "Filters which expression logs are included based on tags."
        }}
      />
      {/* Specific fields for Expression Log that aren't in the generic policy */}
      <Box sx={{ ml: 2, mt: -2, mb: 2 }}>
        <TextField
          label="Expression Lines Per Character"
          type="number"
          value={stackInstructions.expressionLinesPerCharacter}
          onChange={(e) => handlePolicyChange('expressionLinesPerCharacter', parseInt(e.target.value))}
          sx={{ my: 2, width: '250px' }}
          inputProps={{ min: 0 }}
          InputProps={{
            endAdornment: <InfoDialog title="Expression Lines Per Character" content="The maximum number of lines of narrative prose to extract and summarize for character expressions." />
          }}
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={stackInstructions.emotionWeighting}
              onChange={(e) => handlePolicyChange('emotionWeighting', e.target.checked)}
            />
          }
          label="Emotion Weighting"
        />
      </Box>

      <Divider sx={{ my: 3 }} />

      <PolicyEditor
        title="World State Policy"
        policy={stackInstructions.worldStatePolicy}
        onPolicyChange={(p) => handlePolicyChange('worldStatePolicy', p)}
        infoContent={{
          main: "Controls how the current world state JSON is included in the AI's context.",
          mode: "Controls when the world state is included.",
          filtering: "Filters which parts of the world state are included (e.g., scene-only)."
        }}
      />

      <Divider sx={{ my: 3 }} />

      <PolicyEditor
        title="Known Entities Policy"
        policy={stackInstructions.knownEntitiesPolicy}
        onPolicyChange={(p) => handlePolicyChange('knownEntitiesPolicy', p)}
        infoContent={{
          main: "Controls how a list of 'known entities' (tagged items, characters, locations) is included. This list reminds the AI of important things without sending the full world state.",
          mode: "Controls when the known entities list is included.",
          filtering: "Filters which known entities are listed."
        }}
      />

      <Divider sx={{ my: 3 }} />

      {/* -- Use the new TokenPolicyEditor -- */}
      <TokenPolicyEditor
        tokenPolicy={stackInstructions.tokenPolicy}
        onPolicyChange={(p) => handlePolicyChange('tokenPolicy', p)}
      />
    </CollapsibleSection>
  );
};

export { StackInstructionsEditor };