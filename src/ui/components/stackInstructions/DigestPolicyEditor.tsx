// src/ui/components/stackInstructions/DigestPolicyEditor.tsx
import React from 'react';
import {
  Box,
  Typography,
  TextField,
  FormControl,
  RadioGroup,
  FormControlLabel,
  Radio,
  Grid,
  Switch,
} from '@mui/material';
import type {
  DigestFilterPolicy,
  EmissionRule
} from '../../../models';

import  {
  StackMode,
  FilterMode,
} from '../../../models';
import { InfoDialog } from '../InfoDialog';

interface DigestPolicyEditorProps {
  digestPolicy: DigestFilterPolicy;
  digestEmission: Record<number, EmissionRule>;
  onPolicyChange: (updatedPolicy: DigestFilterPolicy) => void;
  onEmissionChange: (updatedEmission: Record<number, EmissionRule>) => void;
}

export const DigestPolicyEditor: React.FC<DigestPolicyEditorProps> = ({
  digestPolicy,
  digestEmission,
  onPolicyChange,
  onEmissionChange,
}) => {
  const handleEmissionRuleChange = (score: number, field: keyof EmissionRule, value: any) => {
    const currentRule = digestEmission[score] || { mode: StackMode.NEVER, n: 0 };
    onEmissionChange({
      ...digestEmission,
      [score]: { ...currentRule, [field]: value },
    });
  };

  return (
    <Box sx={{ mb: 4, border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Digest Lines Emission & Policy
        </Typography>
        <FormControlLabel
          control={
            <Switch
              checked={digestPolicy.enabled ?? false}
              onChange={(e) => onPolicyChange({ ...digestPolicy, enabled: e.target.checked })}
            />
          }
          label="Enable"
          labelPlacement="start"
        />
      </Box>
      <Box sx={{ opacity: digestPolicy.enabled ? 1 : 0.5, pointerEvents: digestPolicy.enabled ? 'auto' : 'none' }}>
        <Typography gutterBottom>
          Global Digest Filtering Policy
          <InfoDialog
            title="Global Digest Filtering Policy"
            content={`Applies a filter to ALL digest lines before their individual emission rules are checked.\n\n- NONE: No global filtering.\n- SCENE_ONLY: Only consider digests relevant to the current scene.\n- TAGGED: Only consider digests that have any tags.`}
          />
        </Typography>
        <FormControl component="fieldset" fullWidth margin="normal">
          <RadioGroup
            row
            value={digestPolicy.filtering}
            onChange={(e) => onPolicyChange({ ...digestPolicy, filtering: e.target.value as FilterMode })}
          >
            {Object.values(FilterMode).map((mode) => (
              <FormControlLabel key={mode} value={mode} control={<Radio />} label={mode} />
            ))}
          </RadioGroup>
        </FormControl>
        <Grid container spacing={2} sx={{ mt: 2 }}>
          {[5, 4, 3, 2, 1].map((score) => (
            // 1. Grid item is now ONLY responsible for layout.
            <Grid item xs={12} sm={6} md={4} key={score}>
              {/* 2. A nested Box handles ALL styling (border, padding). This resolves the error. */}
              <Box sx={{ border: '1px solid', borderColor: 'divider', p: 1.5, borderRadius: 1 }}>
                <Typography variant="subtitle2">
                  Importance {score} Digests
                  <InfoDialog
                    title={`Digest Importance Score ${score} Rule`}
                    content={`Determines how digest lines with an importance score of ${score} are included.`}
                  />
                </Typography>
                <FormControl component="fieldset" fullWidth size="small">
                  <RadioGroup
                    row
                    value={digestEmission[score]?.mode || StackMode.NEVER}
                    onChange={(e) => handleEmissionRuleChange(score, 'mode', e.target.value as StackMode)}
                  >
                    {Object.values(StackMode).filter(m => m !== StackMode.FILTERED).map((mode) => (
                      <FormControlLabel key={mode} value={mode} control={<Radio size="small" />} label={mode} sx={{ mb: -1 }}/>
                    ))}
                  </RadioGroup>
                  {(digestEmission[score]?.mode === StackMode.FIRST_N ||
                    digestEmission[score]?.mode === StackMode.AFTER_N) && (
                      <TextField
                        label="N"
                        type="number"
                        value={digestEmission[score]?.n || 0}
                        onChange={(e) => handleEmissionRuleChange(score, 'n', parseInt(e.target.value))}
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
  );
};