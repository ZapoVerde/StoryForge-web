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
} from '@mui/material';
import { CollapsibleSection } from './CollapsibleSection';
import { StackInstructions, StackMode, FilterMode, EmissionRule } from '../../models/StackInstructions'; // Assuming StackInstructions model is available

interface StackInstructionsEditorProps {
  stackInstructions: StackInstructions;
  onStackInstructionsChange: (updatedInstructions: StackInstructions) => void;
}

const StackInstructionsEditor: React.FC<StackInstructionsEditorProps> = ({
  stackInstructions,
  onStackInstructionsChange,
}) => {
  const handleProsePolicyChange = (
    policyKey: keyof StackInstructions,
    field: keyof EmissionRule | 'filtering', // EmissionRule and ProsePolicy have similar structure for mode/n
    value: any
  ) => {
    const currentPolicy = stackInstructions[policyKey] as EmissionRule; // Cast to common interface
    onStackInstructionsChange({
      ...stackInstructions,
      [policyKey]: { ...currentPolicy, [field]: value },
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

  const handleDigestFilterPolicyChange = (filterMode: FilterMode) => {
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
      <Typography variant="subtitle1" gutterBottom>
        Narrator Prose Emission
      </Typography>
      <FormControl component="fieldset" fullWidth sx={{ mb: 2 }}>
        <RadioGroup
          row
          value={stackInstructions.narratorProseEmission.mode}
          onChange={(e) =>
            handleProsePolicyChange('narratorProseEmission', 'mode', e.target.value as StackMode)
          }
        >
          {Object.values(StackMode).map((mode) => (
            <FormControlLabel key={mode} value={mode} control={<Radio />} label={mode} />
          ))}
        </RadioGroup>
        {(stackInstructions.narratorProseEmission.mode === StackMode.FIRST_N ||
          stackInstructions.narratorProseEmission.mode === StackMode.AFTER_N) && (
          <TextField
            label="N (Turns/Count)"
            type="number"
            value={stackInstructions.narratorProseEmission.n}
            onChange={(e) => handleProsePolicyChange('narratorProseEmission', 'n', parseInt(e.target.value))}
            sx={{ mt: 1, width: '150px' }}
          />
        )}
        <FormControl fullWidth sx={{ mt: 1 }}>
          <InputLabel>Filtering</InputLabel>
          <Select
            value={stackInstructions.narratorProseEmission.filtering}
            label="Filtering"
            onChange={(e) =>
              handleProsePolicyChange('narratorProseEmission', 'filtering', e.target.value as FilterMode)
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

      <Divider sx={{ my: 2 }} />

      <Typography variant="subtitle1" gutterBottom>
        Digest Lines Emission & Policy
      </Typography>
      <FormControl component="fieldset" fullWidth sx={{ mb: 2 }}>
        <FormLabel component="legend">Global Digest Filtering Policy</FormLabel>
        <RadioGroup
          row
          value={stackInstructions.digestPolicy.filtering}
          onChange={(e) => handleDigestFilterPolicyChange(e.target.value as FilterMode)}
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
              <Typography variant="subtitle2">Importance {score} Digests</Typography>
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
                  />
                )}
              </FormControl>
            </Box>
          </Grid>
        ))}
      </Grid>

      <Divider sx={{ my: 2 }} />

      <Typography variant="subtitle1" gutterBottom>
        Expression Log Policy
      </Typography>
      <FormControl component="fieldset" fullWidth sx={{ mb: 2 }}>
        <RadioGroup
          row
          value={stackInstructions.expressionLogPolicy.mode}
          onChange={(e) =>
            handleProsePolicyChange('expressionLogPolicy', 'mode', e.target.value as StackMode)
          }
        >
          {Object.values(StackMode).map((mode) => (
            <FormControlLabel key={mode} value={mode} control={<Radio />} label={mode} />
          ))}
        </RadioGroup>
        {(stackInstructions.expressionLogPolicy.mode === StackMode.FIRST_N ||
          stackInstructions.expressionLogPolicy.mode === StackMode.AFTER_N) && (
          <TextField
            label="N (Turns/Count)"
            type="number"
            value={stackInstructions.expressionLogPolicy.n}
            onChange={(e) => handleProsePolicyChange('expressionLogPolicy', 'n', parseInt(e.target.value))}
            sx={{ mt: 1, width: '150px' }}
          />
        )}
        <FormControl fullWidth sx={{ mt: 1 }}>
          <InputLabel>Filtering</InputLabel>
          <Select
            value={stackInstructions.expressionLogPolicy.filtering}
            label="Filtering"
            onChange={(e) =>
              handleProsePolicyChange('expressionLogPolicy', 'filtering', e.target.value as FilterMode)
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
        label="Expression Lines Per Character"
        type="number"
        value={stackInstructions.expressionLinesPerCharacter}
        onChange={(e) => onStackInstructionsChange({ ...stackInstructions, expressionLinesPerCharacter: parseInt(e.target.value) })}
        sx={{ mb: 2, width: '200px' }}
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

      <Divider sx={{ my: 2 }} />

      <Typography variant="subtitle1" gutterBottom>
        World State Policy
      </Typography>
      <FormControl component="fieldset" fullWidth sx={{ mb: 2 }}>
        <RadioGroup
          row
          value={stackInstructions.worldStatePolicy.mode}
          onChange={(e) =>
            handleProsePolicyChange('worldStatePolicy', 'mode', e.target.value as StackMode)
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
            onChange={(e) => handleProsePolicyChange('worldStatePolicy', 'n', parseInt(e.target.value))}
            sx={{ mt: 1, width: '150px' }}
          />
        )}
        <FormControl fullWidth sx={{ mt: 1 }}>
          <InputLabel>Filtering</InputLabel>
          <Select
            value={stackInstructions.worldStatePolicy.filtering}
            label="Filtering"
            onChange={(e) =>
              handleProsePolicyChange('worldStatePolicy', 'filtering', e.target.value as FilterMode)
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

      <Divider sx={{ my: 2 }} />

      <Typography variant="subtitle1" gutterBottom>
        Known Entities Policy
      </Typography>
      <FormControl component="fieldset" fullWidth sx={{ mb: 2 }}>
        <RadioGroup
          row
          value={stackInstructions.knownEntitiesPolicy.mode}
          onChange={(e) =>
            handleProsePolicyChange('knownEntitiesPolicy', 'mode', e.target.value as StackMode)
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
            onChange={(e) => handleProsePolicyChange('knownEntitiesPolicy', 'n', parseInt(e.target.value))}
            sx={{ mt: 1, width: '150px' }}
          />
        )}
        <FormControl fullWidth sx={{ mt: 1 }}>
          <InputLabel>Filtering</InputLabel>
          <Select
            value={stackInstructions.knownEntitiesPolicy.filtering}
            label="Filtering"
            onChange={(e) =>
              handleProsePolicyChange('knownEntitiesPolicy', 'filtering', e.target.value as FilterMode)
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

      <Divider sx={{ my: 2 }} />

      <TextField
        fullWidth
        label="Output Format"
        value={stackInstructions.outputFormat}
        onChange={(e) => onStackInstructionsChange({ ...stackInstructions, outputFormat: e.target.value })}
        sx={{ mb: 2 }}
      />

      <Typography variant="subtitle1" gutterBottom>
        Token Policy
      </Typography>
      <TextField
        fullWidth
        label="Min Tokens"
        type="number"
        value={stackInstructions.tokenPolicy.minTokens}
        onChange={(e) => handleTokenPolicyChange('minTokens', parseInt(e.target.value))}
        sx={{ mb: 1.5 }}
      />
      <TextField
        fullWidth
        label="Max Tokens"
        type="number"
        value={stackInstructions.tokenPolicy.maxTokens}
        onChange={(e) => handleTokenPolicyChange('maxTokens', parseInt(e.target.value))}
        sx={{ mb: 1.5 }}
      />
      <TextField
        fullWidth
        label="Fallback Plan (comma-separated)"
        value={stackInstructions.tokenPolicy.fallbackPlan.join(', ')}
        onChange={(e) => handleTokenPolicyChange('fallbackPlan', e.target.value.split(',').map(s => s.trim()))}
        sx={{ mb: 1.5 }}
      />
    </CollapsibleSection>
  );
};