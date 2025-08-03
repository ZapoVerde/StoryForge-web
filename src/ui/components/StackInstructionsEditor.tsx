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
} from '@mui/material';
import { CollapsibleSection } from './CollapsibleSection';
// Import StackModes and FilterModes as values
import { StackInstructions, StackModes, FilterModes, EmissionRule, ProsePolicy } from '../../models/StackInstructions';
import type { StackMode, FilterMode } from '../../models/StackInstructions'; // Keep type imports for type usage

interface StackInstructionsEditorProps {
  stackInstructions: StackInstructions;
  onStackInstructionsChange: (updatedInstructions: StackInstructions) => void;
}

const StackInstructionsEditor: React.FC<StackInstructionsEditorProps> = ({
  stackInstructions,
  onStackInstructionsChange,
}) => {
  // Helper to update a ProsePolicy or EmissionRule (they share 'mode' and 'n')
  const handlePolicyChange = (
    policyKey: keyof StackInstructions, // Can be 'narratorProseEmission', 'expressionLogPolicy', etc.
    field: keyof ProsePolicy | keyof EmissionRule, // 'mode', 'n', or 'filtering'
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
    const currentRule = stackInstructions.digestEmission[score] || { mode: StackModes.NEVER, n: 0 }; // Use StackModes.NEVER
    onStackInstructionsChange({
      ...stackInstructions,
      digestEmission: {
        ...stackInstructions.digestEmission,
        [score]: { ...currentRule, [field]: value },
      },
    });
  };

  const handleDigestFilterPolicyChange = (filterMode: FilterMode) => { // FilterMode type used here
    onStackInstructionsChange({
      ...stackInstructions,
      digestPolicy: { filtering: filterMode },
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

  return (
    <CollapsibleSection title="🧠 Stack Instructions" initiallyExpanded={false}>
      <Typography variant="h6" gutterBottom>
        Narrator Prose Emission
      </Typography>
      <FormControl component="fieldset" fullWidth margin="normal">
        <FormLabel component="legend">Mode</FormLabel>
        <RadioGroup
          row
          value={stackInstructions.narratorProseEmission.mode}
          onChange={(e) =>
            handlePolicyChange('narratorProseEmission', 'mode', e.target.value as StackMode) // StackMode type used here
          }
        >
          {/* Iterate over values of StackModes object */}
          {Object.values(StackModes).map((mode) => (
            <FormControlLabel key={mode} value={mode} control={<Radio />} label={mode} />
          ))}
        </RadioGroup>
        {(stackInstructions.narratorProseEmission.mode === StackModes.FIRST_N || // Use StackModes.FIRST_N
          stackInstructions.narratorProseEmission.mode === StackModes.AFTER_N) && ( // Use StackModes.AFTER_N
          <TextField
            label="N (Turns/Count)"
            type="number"
            value={stackInstructions.narratorProseEmission.n}
            onChange={(e) => handlePolicyChange('narratorProseEmission', 'n', parseInt(e.target.value))}
            sx={{ mt: 1, width: '150px' }}
            inputProps={{ min: 0 }}
          />
        )}
        <FormControl fullWidth sx={{ mt: 2 }}>
          <InputLabel id="narrator-filtering-label">Filtering</InputLabel>
          <Select
            labelId="narrator-filtering-label"
            value={stackInstructions.narratorProseEmission.filtering}
            label="Filtering"
            onChange={(e) =>
              handlePolicyChange('narratorProseEmission', 'filtering', e.target.value as FilterMode) // FilterMode type used here
            }
          >
            {/* Iterate over values of FilterModes object */}
            {Object.values(FilterModes).map((mode) => (
              <MenuItem key={mode} value={mode}>
                {mode}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </FormControl>

      <Divider sx={{ my: 3 }} />

      <Typography variant="h6" gutterBottom>
        Digest Lines Emission & Policy
      </Typography>
      <FormControl component="fieldset" fullWidth margin="normal">
        <FormLabel component="legend">Global Digest Filtering Policy</FormLabel>
        <RadioGroup
          row
          value={stackInstructions.digestPolicy.filtering}
          onChange={(e) => handleDigestFilterPolicyChange(e.target.value as FilterMode)}
        >
          {Object.values(FilterModes).map((mode) => (
            <FormControlLabel key={mode} value={mode} control={<Radio />} label={mode} />
          ))}
        </RadioGroup>
      </FormControl>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        {[5, 4, 3, 2, 1].map((score) => (
          <Grid item xs={12} sm={6} md={4} key={score}>
            <Box sx={{ border: '1px solid #ccc', p: 1.5, borderRadius: 1 }}>
              <Typography variant="subtitle2">Importance {score} Digests</Typography>
              <FormControl component="fieldset" fullWidth size="small">
                <RadioGroup
                  row
                  value={stackInstructions.digestEmission[score]?.mode || StackModes.NEVER} // Use StackModes.NEVER
                  onChange={(e) =>
                    handleDigestEmissionChange(score, 'mode', e.target.value as StackMode)
                  }
                >
                  {Object.values(StackModes).map((mode) => (
                    <FormControlLabel key={mode} value={mode} control={<Radio size="small" />} label={mode} />
                  ))}
                </RadioGroup>
                {(stackInstructions.digestEmission[score]?.mode === StackModes.FIRST_N || // Use StackModes.FIRST_N
                  stackInstructions.digestEmission[score]?.mode === StackModes.AFTER_N) && ( // Use StackModes.AFTER_N
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

      <Divider sx={{ my: 3 }} />

      <Typography variant="h6" gutterBottom>
        Expression Log Policy
      </Typography>
      <FormControl component="fieldset" fullWidth margin="normal">
        <FormLabel component="legend">Mode</FormLabel>
        <RadioGroup
          row
          value={stackInstructions.expressionLogPolicy.mode}
          onChange={(e) =>
            handlePolicyChange('expressionLogPolicy', 'mode', e.target.value as StackMode)
          }
        >
          {Object.values(StackModes).map((mode) => (
            <FormControlLabel key={mode} value={mode} control={<Radio />} label={mode} />
          ))}
        </RadioGroup>
        {(stackInstructions.expressionLogPolicy.mode === StackModes.FIRST_N ||
          stackInstructions.expressionLogPolicy.mode === StackModes.AFTER_N) && (
          <TextField
            label="N (Turns/Count)"
            type="number"
            value={stackInstructions.expressionLogPolicy.n}
            onChange={(e) => handlePolicyChange('expressionLogPolicy', 'n', parseInt(e.target.value))}
            sx={{ mt: 1, width: '150px' }}
            inputProps={{ min: 0 }}
          />
        )}
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
            {Object.values(FilterModes).map((mode) => (
              <MenuItem key={mode} value={mode}>
                {mode}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </FormControl>
      <TextField
        fullWidth
        label="Expression Lines Per Character"
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
        label="Emotion Weighting"
      />

      <Divider sx={{ my: 3 }} />

      <Typography variant="h6" gutterBottom>
        World State Policy
      </Typography>
      <FormControl component="fieldset" fullWidth margin="normal">
        <FormLabel component="legend">Mode</FormLabel>
        <RadioGroup
          row
          value={stackInstructions.worldStatePolicy.mode}
          onChange={(e) =>
            handlePolicyChange('worldStatePolicy', 'mode', e.target.value as StackMode)
          }
        >
          {Object.values(StackModes).map((mode) => (
            <FormControlLabel key={mode} value={mode} control={<Radio />} label={mode} />
          ))}
        </RadioGroup>
        {(stackInstructions.worldStatePolicy.mode === StackModes.FIRST_N ||
          stackInstructions.worldStatePolicy.mode === StackModes.AFTER_N) && (
          <TextField
            label="N (Items/Count)"
            type="number"
            value={stackInstructions.worldStatePolicy.n}
            onChange={(e) => handlePolicyChange('worldStatePolicy', 'n', parseInt(e.target.value))}
            sx={{ mt: 1, width: '150px' }}
            inputProps={{ min: 0 }}
          />
        )}
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
            {Object.values(FilterModes).map((mode) => (
              <MenuItem key={mode} value={mode}>
                {mode}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </FormControl>

      <Divider sx={{ my: 3 }} />

      <Typography variant="h6" gutterBottom>
        Known Entities Policy
      </Typography>
      <FormControl component="fieldset" fullWidth margin="normal">
        <FormLabel component="legend">Mode</FormLabel>
        <RadioGroup
          row
          value={stackInstructions.knownEntitiesPolicy.mode}
          onChange={(e) =>
            handlePolicyChange('knownEntitiesPolicy', 'mode', e.target.value as StackMode)
          }
        >
          {Object.values(StackModes).map((mode) => (
            <FormControlLabel key={mode} value={mode} control={<Radio />} label={mode} />
          ))}
        </RadioGroup>
        {(stackInstructions.knownEntitiesPolicy.mode === StackModes.FIRST_N ||
          stackInstructions.knownEntitiesPolicy.mode === StackModes.AFTER_N) && (
          <TextField
            label="N (Entities)"
            type="number"
            value={stackInstructions.knownEntitiesPolicy.n}
            onChange={(e) => handlePolicyChange('knownEntitiesPolicy', 'n', parseInt(e.target.value))}
            sx={{ mt: 1, width: '150px' }}
            inputProps={{ min: 0 }}
          />
        )}
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
            {Object.values(FilterModes).map((mode) => (
              <MenuItem key={mode} value={mode}>
                {mode}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </FormControl>

      <Divider sx={{ my: 3 }} />

      <Typography variant="h6" gutterBottom>
        Output Format
      </Typography>
      <TextField
        fullWidth
        label="Output Format String"
        value={stackInstructions.outputFormat}
        onChange={(e) => onStackInstructionsChange({ ...stackInstructions, outputFormat: e.target.value })}
        sx={{ mb: 3 }}
      />

      <Typography variant="h6" gutterBottom>
        Token Policy
      </Typography>
      <TextField
        fullWidth
        label="Min Tokens"
        type="number"
        value={stackInstructions.tokenPolicy.minTokens}
        onChange={(e) => handleTokenPolicyChange('minTokens', parseInt(e.target.value))}
        sx={{ mb: 2 }}
        inputProps={{ min: 0 }}
      />
      <TextField
        fullWidth
        label="Max Tokens"
        type="number"
        value={stackInstructions.tokenPolicy.maxTokens}
        onChange={(e) => handleTokenPolicyChange('maxTokens', parseInt(e.target.value))}
        sx={{ mb: 2 }}
        inputProps={{ min: 0 }}
      />
      <TextField
        fullWidth
        label="Fallback Plan (comma-separated, e.g., drop_known_entities, truncate_expression_logs)"
        value={stackInstructions.tokenPolicy.fallbackPlan.join(', ')}
        onChange={(e) => handleTokenPolicyChange('fallbackPlan', e.target.value.split(',').map(s => s.trim()))}
        sx={{ mb: 2 }}
      />
    </CollapsibleSection>
  );
};

// Add the named export here
export { StackInstructionsEditor };