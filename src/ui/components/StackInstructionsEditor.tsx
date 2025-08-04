// src/ui/components/StackInstructionsEditor.tsx

import React from 'react';
import {
  Box,
  Typography,
  TextField,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Checkbox,
  Divider,
  Switch,
} from '@mui/material';
import { CollapsibleSection } from './CollapsibleSection';
import { StackInstructions, StackMode, FilterMode, EmissionRule, ProsePolicy, DigestFilterPolicy } from '../../models/StackInstructions';
import { InfoDialog } from './InfoDialog';

interface StackInstructionsEditorProps {
  stackInstructions: StackInstructions;
  onStackInstructionsChange: (updatedInstructions: StackInstructions) => void;
}

const StackInstructionsEditor: React.FC<StackInstructionsEditorProps> = ({
  stackInstructions,
  onStackInstructionsChange,
}) => {
  // Helper to update a policy (ProsePolicy, DigestFilterPolicy, EmissionRule)
  const handlePolicyChange = (
    policyKey: keyof StackInstructions,
    field: keyof ProsePolicy | keyof EmissionRule | keyof DigestFilterPolicy,
    value: any
  ) => {
    onStackInstructionsChange({
      ...stackInstructions,
      [policyKey]: { ...(stackInstructions[policyKey] as any), [field]: value },
    });
  };

  const handleDigestEmissionChange = (
    score: number,
    field: keyof EmissionRule,
    value: any
  ) => {
    const currentRule = stackInstructions.digestEmission[score] || { mode: StackMode.NEVER, n: 0 };
    onStackInstructionsChange({
      ...stackInstructions,
      digestEmission: {
        ...stackInstructions.digestEmission,
        [score]: { ...currentRule, [field]: value },
      },
    });
  };

  const handleTokenPolicyChange = (
    field: keyof StackInstructions['tokenPolicy'],
    value: any
  ) => {
    onStackInstructionsChange({
      ...stackInstructions,
      tokenPolicy: { ...stackInstructions.tokenPolicy, [field]: value },
    });
  };

  // Generic toggle for enabled state of a policy
  const handleToggleEnable = (policyName: keyof StackInstructions) => {
    const currentPolicy = stackInstructions[policyName] as ProsePolicy | DigestFilterPolicy;
    onStackInstructionsChange({
      ...stackInstructions,
      [policyName]: { ...currentPolicy, enabled: !currentPolicy.enabled },
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
            content={`The AI's 'memory' for each turn is built from a 'context stack' of information. This stack is essentially a list of messages sent to the AI, preceding your current input.

The **order** in which these elements are presented to the AI can significantly impact its responses and adherence to rules. Generally, more important and structured information (like world state and rules) should come earlier in the stack, followed by dynamic elements (like logs and conversation history).

Each section below can be individually enabled/disabled using the toggle switches. If a section is disabled, it will not be included in the AI's prompt for subsequent turns, saving tokens but potentially reducing AI's context.`}
          />
        </Typography>
      </Box>

      {/* Narrator Prose Emission */}
      <Box sx={{ mb: 4, border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Narrator Prose Emission
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={stackInstructions.narratorProseEmission.enabled || false}
                onChange={() => handleToggleEnable('narratorProseEmission')}
              />
            }
            label="Enable"
            labelPlacement="start"
          />
        </Box>
        <Box sx={{ opacity: stackInstructions.narratorProseEmission.enabled ? 1 : 0.5, pointerEvents: stackInstructions.narratorProseEmission.enabled ? 'auto' : 'none' }}>
          <Typography gutterBottom>
            Mode
            <InfoDialog
              title="Narrator Prose Emission Mode"
              content={`Controls how past narrator output (the main story text) is included in the AI's context.

- ALWAYS: Include all past narrator prose.
- FIRST_N: Include prose only from the first 'N' turns.
- AFTER_N: Include prose only from turns after 'N'.
- NEVER: Do not include any past narrator prose.`}
            />
          </Typography>
          <FormControl component="fieldset" fullWidth margin="normal">
            <RadioGroup
              row
              value={stackInstructions.narratorProseEmission.mode}
              onChange={(e) =>
                handlePolicyChange('narratorProseEmission', 'mode', e.target.value as StackMode)
              }
            >
              {Object.values(StackMode).map((mode) => (
                <FormControlLabel key={mode} value={mode} control={<Radio />} label={mode} />
              ))}
            </RadioGroup>
            {(stackInstructions.narratorProseEmission.mode === StackMode.FIRST_N ||
              stackInstructions.narratorProseEmission.mode === StackMode.AFTER_N) && (
                <TextField
                  label="N (Turns)"
                  type="number"
                  value={stackInstructions.narratorProseEmission.n}
                  onChange={(e) => handlePolicyChange('narratorProseEmission', 'n', parseInt(e.target.value))}
                  sx={{ mt: 1, width: '150px' }}
                  inputProps={{ min: 0 }}
                />
              )}
            <Typography gutterBottom sx={{ mt: 2 }}>
              Filtering
              <InfoDialog
                title="Narrator Prose Filtering"
                content={`Filters which narrator prose lines are included based on their content or associated tags.

- NONE: Include all prose based on the selected mode.
- SCENE_ONLY: Only include prose that contains tags (e.g., #character, @location) relevant to the current scene.
- TAGGED: Only include prose that contains any recognized tags (any #, @, or $ tag).`}
              />
            </Typography>
            <FormControl fullWidth>
              <InputLabel id="narrator-filtering-label">Filtering</InputLabel>
              <Select
                labelId="narrator-filtering-label"
                value={stackInstructions.narratorProseEmission.filtering}
                label="Filtering"
                onChange={(e) =>
                  handlePolicyChange('narratorProseEmission', 'filtering', e.target.value as FilterMode)
                }
              >
                {Object.values(FilterMode).map((mode) => (
                  <MenuItem key={mode} value={mode}>
                    {mode}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </FormControl>
        </Box>
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* Digest Lines Emission & Policy */}
      <Box sx={{ mb: 4, border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Digest Lines Emission & Policy
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={stackInstructions.digestPolicy.enabled || false}
                onChange={() => handleToggleEnable('digestPolicy')}
              />
            }
            label="Enable"
            labelPlacement="start"
          />
        </Box>
        <Box sx={{ opacity: stackInstructions.digestPolicy.enabled ? 1 : 0.5, pointerEvents: stackInstructions.digestPolicy.enabled ? 'auto' : 'none' }}>
          <Typography gutterBottom>
            Global Digest Filtering Policy
            <InfoDialog
              title="Global Digest Filtering Policy"
              content={`Applies a filter to ALL digest lines before their individual emission rules are checked.

- NONE: No global filtering, all digests are considered.
- SCENE_ONLY: Only consider digests that contain tags (e.g., #character, @location) relevant to the current scene.
- TAGGED: Only consider digests that have any recognized tags.`}
            />
          </Typography>
          <FormControl component="fieldset" fullWidth margin="normal">
            <RadioGroup
              row
              value={stackInstructions.digestPolicy.filtering}
              onChange={(e) => handlePolicyChange('digestPolicy', 'filtering', e.target.value as FilterMode)}
            >
              {Object.values(FilterMode).map((mode) => (
                <FormControlLabel key={mode} value={mode} control={<Radio />} label={mode} />
              ))}
            </RadioGroup>
          </FormControl>

          <Grid container spacing={2} sx={{ mb: 2 }}>
            {[5, 4, 3, 2, 1].map((score) => (
              <Grid item xs={12} sm={6} md={4} key={score}>
                <Box sx={{ border: '1px solid #ccc', p: 1.5, borderRadius: 1 }}>
                  <Typography variant="subtitle2">
                    Importance {score} Digests
                    <InfoDialog
                      title={`Digest Importance Score ${score} Rule`}
                      content={`Determines how digest lines with an importance score of ${score} are included in the AI's context. Higher scores are more critical events.

- ALWAYS: Include all digests of this score.
- FIRST_N: Include digests of this score only from the first 'N' turns.
- AFTER_N: Include digests of this score only from turns after 'N'.
- NEVER: Do not include any digests of this score.`}
                    />
                  </Typography>
                  <FormControl component="fieldset" fullWidth size="small">
                    <RadioGroup
                      row
                      value={stackInstructions.digestEmission[score]?.mode || StackMode.NEVER}
                      onChange={(e) =>
                        handleDigestEmissionChange(score, 'mode', e.target.value as StackMode)
                      }
                    >
                      {Object.values(StackMode).map((mode) => (
                        <FormControlLabel key={mode} value={mode} control={<Radio size="small" />} label={mode} />
                      ))}
                    </RadioGroup>
                    {(stackInstructions.digestEmission[score]?.mode === StackMode.FIRST_N ||
                      stackInstructions.digestEmission[score]?.mode === StackMode.AFTER_N) && (
                        <TextField
                          label="N"
                          type="number"
                          value={stackInstructions.digestEmission[score]?.n || 0}
                          onChange={(e) => handleDigestEmissionChange(score, 'n', parseInt(e.target.value))}
                          size="small"
                          sx={{ mt: 1, width: '100px' }}
                          inputProps={{ min: 0 }}
                        />
                      )}
                  </FormControl>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* Expression Log Policy */}
      <Box sx={{ mb: 4, border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Expression Log Policy
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={stackInstructions.expressionLogPolicy.enabled || false}
                onChange={() => handleToggleEnable('expressionLogPolicy')}
              />
            }
            label="Enable"
            labelPlacement="start"
          />
        </Box>
        <Box sx={{ opacity: stackInstructions.expressionLogPolicy.enabled ? 1 : 0.5, pointerEvents: stackInstructions.expressionLogPolicy.enabled ? 'auto' : 'none' }}>
          <Typography gutterBottom>
            Mode
            <InfoDialog
              title="Expression Log Mode"
              content={`Controls how character 'expression' (portions of past narrator prose related to character actions/emotions) is included.

- ALWAYS: Include all relevant expression logs.
- FIRST_N: Include expression logs only from the first 'N' turns.
- AFTER_N: Include expression logs only from turns after 'N'.
- NEVER: Do not include any expression logs.`}
            />
          </Typography>
          <FormControl component="fieldset" fullWidth margin="normal">
            <RadioGroup
              row
              value={stackInstructions.expressionLogPolicy.mode}
              onChange={(e) =>
                handlePolicyChange('expressionLogPolicy', 'mode', e.target.value as StackMode)
              }
            >
              {Object.values(StackMode).map((mode) => (
                <FormControlLabel key={mode} value={mode} control={<Radio />} label={mode} />
              ))}
            </RadioGroup>
            {(stackInstructions.expressionLogPolicy.mode === StackMode.FIRST_N ||
              stackInstructions.expressionLogPolicy.mode === StackMode.AFTER_N) && (
                <TextField
                  label="N (Turns)"
                  type="number"
                  value={stackInstructions.expressionLogPolicy.n}
                  onChange={(e) => handlePolicyChange('expressionLogPolicy', 'n', parseInt(e.target.value))}
                  sx={{ mt: 1, width: '150px' }}
                  inputProps={{ min: 0 }}
                />
              )}
            <Typography gutterBottom sx={{ mt: 2 }}>
              Filtering
              <InfoDialog
                title="Expression Log Filtering"
                content={`Filters which expression logs are included based on their content or associated tags.

- NONE: Include all expression logs based on the selected mode.
- SCENE_ONLY: Only include expression logs that contain tags relevant to the current scene.
- TAGGED: Only include expression logs that contain any recognized tags.`}
              />
            </Typography>
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel id="expression-filtering-label">Filtering</InputLabel>
              <Select
                labelId="expression-filtering-label"
                value={stackInstructions.expressionLogPolicy.filtering}
                label="Filtering"
                onChange={(e) =>
                  handlePolicyChange('expressionLogPolicy', 'filtering', e.target.value as FilterMode)
                }
              >
                {Object.values(FilterMode).map((mode) => (
                  <MenuItem key={mode} value={mode}>
                    {mode}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </FormControl>
          <TextField
            fullWidth
            label={
              <>
                Expression Lines Per Character
                <InfoDialog
                  title="Expression Lines Per Character"
                  content="The maximum number of lines of narrative prose to extract and summarize for character expressions. A higher number provides more detail but uses more tokens."
                />
              </>
            }
            type="number"
            value={stackInstructions.expressionLinesPerCharacter}
            onChange={(e) => onStackInstructionsChange({ ...stackInstructions, expressionLinesPerCharacter: parseInt(e.target.value) })}
            sx={{ mb: 2, width: '250px' }}
            inputProps={{ min: 0 }}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={stackInstructions.emotionWeighting}
                onChange={(e) => onStackInstructionsChange({ ...stackInstructions, emotionWeighting: e.target.checked })}
              />
            }
            label={
              <>
                Emotion Weighting
                <InfoDialog
                  title="Emotion Weighting"
                  content="If enabled, the system attempts to prioritize or emphasize narrative elements related to character emotions when building the context, potentially influencing AI's empathetic responses."
                />
              </>
            }
          />
        </Box>
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* World State Policy */}
      <Box sx={{ mb: 4, border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            World State Policy
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={stackInstructions.worldStatePolicy.enabled || false}
                onChange={() => handleToggleEnable('worldStatePolicy')}
              />
            }
            label="Enable"
            labelPlacement="start"
          />
        </Box>
        <Box sx={{ opacity: stackInstructions.worldStatePolicy.enabled ? 1 : 0.5, pointerEvents: stackInstructions.worldStatePolicy.enabled ? 'auto' : 'none' }}>
          <Typography gutterBottom>
            Mode
            <InfoDialog
              title="World State Policy Mode"
              content={`Controls how the current world state JSON is included in the AI's context.

- ALWAYS: Include the full current world state.
- FILTERED: Include only parts of the world state (e.g., pinned items or scene-relevant data). This requires proper filtering logic in the system.
- NEVER: Do not include any world state.`}
            />
          </Typography>
          <FormControl component="fieldset" fullWidth margin="normal">
            <RadioGroup
              row
              value={stackInstructions.worldStatePolicy.mode}
              onChange={(e) =>
                handlePolicyChange('worldStatePolicy', 'mode', e.target.value as StackMode)
              }
            >
              {Object.values(StackMode).map((mode) => (
                <FormControlLabel key={mode} value={mode} control={<Radio />} label={mode} />
              ))}
            </RadioGroup>
            {(stackInstructions.worldStatePolicy.mode === StackMode.FIRST_N ||
              stackInstructions.worldStatePolicy.mode === StackMode.AFTER_N) && (
                <TextField
                  label="N (Items/Count)"
                  type="number"
                  value={stackInstructions.worldStatePolicy.n}
                  onChange={(e) => handlePolicyChange('worldStatePolicy', 'n', parseInt(e.target.value))}
                  sx={{ mt: 1, width: '150px' }}
                  inputProps={{ min: 0 }}
                />
              )}
            <Typography gutterBottom sx={{ mt: 2 }}>
              Filtering
              <InfoDialog
                title="World State Filtering"
                content={`Filters which parts of the world state are included.

- NONE: Include all world state data based on the selected mode.
- SCENE_ONLY: Include only world state data directly related to entities present in the current scene.
- TAGGED: Include only world state data for entities that have tags.`}
              />
            </Typography>
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel id="worldstate-filtering-label">Filtering</InputLabel>
              <Select
                labelId="worldstate-filtering-label"
                value={stackInstructions.worldStatePolicy.filtering}
                label="Filtering"
                onChange={(e) =>
                  handlePolicyChange('worldStatePolicy', 'filtering', e.target.value as FilterMode)
                }
              >
                {Object.values(FilterMode).map((mode) => (
                  <MenuItem key={mode} value={mode}>
                    {mode}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </FormControl>
        </Box>
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* Known Entities Policy */}
      <Box sx={{ mb: 4, border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Known Entities Policy
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={stackInstructions.knownEntitiesPolicy.enabled || false}
                onChange={() => handleToggleEnable('knownEntitiesPolicy')}
              />
            }
            label="Enable"
            labelPlacement="start"
          />
        </Box>
        <Box sx={{ opacity: stackInstructions.knownEntitiesPolicy.enabled ? 1 : 0.5, pointerEvents: stackInstructions.knownEntitiesPolicy.enabled ? 'auto' : 'none' }}>
          <Typography gutterBottom>
            Mode
            <InfoDialog
              title="Known Entities Policy Mode"
              content={`Controls how a list of 'known entities' (tagged items, characters, locations from world state) is included. This list reminds the AI of important things without sending the full world state.

- ALWAYS: Include all known entities.
- FIRST_N: Include known entities up to the 'N'th entity discovered.
- AFTER_N: Include known entities discovered after the 'N'th entity.
- NEVER: Do not include known entities.`}
            />
          </Typography>
          <FormControl component="fieldset" fullWidth margin="normal">
            <RadioGroup
              row
              value={stackInstructions.knownEntitiesPolicy.mode}
              onChange={(e) =>
                handlePolicyChange('knownEntitiesPolicy', 'mode', e.target.value as StackMode)
              }
            >
              {Object.values(StackMode).map((mode) => (
                <FormControlLabel key={mode} value={mode} control={<Radio />} label={mode} />
              ))}
            </RadioGroup>
            {(stackInstructions.knownEntitiesPolicy.mode === StackMode.FIRST_N ||
              stackInstructions.knownEntitiesPolicy.mode === StackMode.AFTER_N) && (
                <TextField
                  label="N (Entities)"
                  type="number"
                  value={stackInstructions.knownEntitiesPolicy.n}
                  onChange={(e) => handlePolicyChange('knownEntitiesPolicy', 'n', parseInt(e.target.value))}
                  sx={{ mt: 1, width: '150px' }}
                  inputProps={{ min: 0 }}
                />
              )}
            <Typography gutterBottom sx={{ mt: 2 }}>
              Filtering
              <InfoDialog
                title="Known Entities Filtering"
                content={`Filters which known entities are listed.

- NONE: Include all known entities found based on the selected mode.
- SCENE_ONLY: Only include entities that are currently present in the scene.
- TAGGED: Only include entities that have explicit #, @, or $ tags.`}
              />
            </Typography>
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel id="knownentities-filtering-label">Filtering</InputLabel>
              <Select
                labelId="knownentities-filtering-label"
                value={stackInstructions.knownEntitiesPolicy.filtering}
                label="Filtering"
                onChange={(e) =>
                  handlePolicyChange('knownEntitiesPolicy', 'filtering', e.target.value as FilterMode)
                }
              >
                {Object.values(FilterMode).map((mode) => (
                  <MenuItem key={mode} value={mode}>
                    {mode}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </FormControl>
        </Box>
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* REMOVED: Output Format */}
      {/*
      <Typography variant="h6" gutterBottom>
        Output Format
        <InfoDialog
          title="Output Format String (Stack Emission)"
          content={`This string defines the *expected order* and *types* of structured blocks the AI should generate in its response, following the \`Emit & Tagging Skeleton\`. It's crucial for the application to correctly parse the AI's output.

**Common keywords (separated by underscores):**
- \`prose\`: The main narrative text.
- \`digest\`: The summarized digest lines (e.g., \`@digest\` block).
- \`emit\`: World state changes (e.g., \`@delta\` block).
- \`scene\`: Scene changes (e.g., \`@scene\` block).

**Example Orders:**
- \`prose_digest_emit_scene\`: Narration, then digest, then deltas, then scene changes.
- \`emit_prose\`: Deltas first, then narration (useful for strict state updates).

**Important:** The AI will try to follow this order, but might occasionally deviate. Ensure your \`Emit & Tagging Skeleton\` also guides the AI to produce these blocks correctly.`}
        />
      </Typography>
      <TextField
        fullWidth
        label="Output Format String"
        value={stackInstructions.outputFormat}
        onChange={(e) => onStackInstructionsChange({ ...stackInstructions, outputFormat: e.target.value })}
        sx={{ mb: 3 }}
      />
      */}

      <Typography variant="h6" gutterBottom>
        Token Policy
      </Typography>
      <TextField
        fullWidth
        label={
          <>
            Min Tokens
            <InfoDialog
              title="Min Tokens"
              content="The AI will attempt to generate a response of at least this many tokens."
            />
          </>
        }
        type="number"
        value={stackInstructions.tokenPolicy.minTokens}
        onChange={(e) =>
          handlePolicyChange(
            'tokenPolicy',
            'minTokens',
            parseInt(e.target.value)
          )
        }
        sx={{ mb: 2 }}
        inputProps={{ min: 0 }}
      />
      <TextField
        fullWidth
        label={
          <>
            Max Tokens
            <InfoDialog
              title="Max Tokens"
              content="The absolute maximum number of tokens the AI can generate."
            />
          </>
        }
        type="number"
        value={stackInstructions.tokenPolicy.maxTokens}
        onChange={(e) =>
          handlePolicyChange(
            'tokenPolicy',
            'maxTokens',
            parseInt(e.target.value)
          )
        }
        sx={{ mb: 2 }}
        inputProps={{ min: 0 }}
      />
      <TextField
        fullWidth
        label={
          <>
            Fallback Plan
            <InfoDialog
              title="Fallback Plan"
              content={`A prioritized, comma-separated list of strategies the system will use to reduce the *input prompt's* token count if it exceeds the AI model's context window.

**Common Fallback Strategies:**
- \`drop_known_entities\`: Removes the 'Known Entities' block.
- \`drop_low_importance_digest\`: Removes low-importance digests.
- \`truncate_expression_logs\`: Shortens expression logs.
- \`drop_narrator_prose\`: Removes past narrator prose.
- \`truncate_conversation_history\`: Shortens older conversation turns.`}
            />
          </>
        }
        value={stackInstructions.tokenPolicy.fallbackPlan.join(', ')}
        onChange={(e) =>
          handleTokenPolicyChange(
            'fallbackPlan',
            e.target.value.split(',').map((s) => s.trim())
          )
        }
        sx={{ mb: 2 }}
      />
  </CollapsibleSection>);
};

export { StackInstructionsEditor };