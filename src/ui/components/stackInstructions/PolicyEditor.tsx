// src/ui/components/stackInstructions/PolicyEditor.tsx
import React from 'react';
import {
  Box,
  Typography,
  TextField,
  FormControl,
  RadioGroup,
  FormControlLabel,
  Radio,
  InputLabel,
  Select,
  MenuItem,
  Switch,
} from '@mui/material';
import { ProsePolicy, StackMode, FilterMode } from '../../../models';
import { InfoDialog } from '../InfoDialog';

interface PolicyEditorProps {
  title: string;
  policy: ProsePolicy;
  onPolicyChange: (updatedPolicy: ProsePolicy) => void;
  infoContent: {
    main: string;
    mode: string;
    filtering: string;
  };
}

export const PolicyEditor: React.FC<PolicyEditorProps> = ({
  title,
  policy,
  onPolicyChange,
  infoContent,
}) => {
  const handleFieldChange = (field: keyof ProsePolicy, value: any) => {
    onPolicyChange({ ...policy, [field]: value });
  };

  return (
    <Box sx={{ mb: 4, border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          {title}
          <InfoDialog title={title} content={infoContent.main} />
        </Typography>
        <FormControlLabel
          control={
            <Switch
              checked={policy.enabled ?? false}
              onChange={(e) => handleFieldChange('enabled', e.target.checked)}
            />
          }
          label="Enable"
          labelPlacement="start"
        />
      </Box>
      <Box sx={{ opacity: policy.enabled ? 1 : 0.5, pointerEvents: policy.enabled ? 'auto' : 'none' }}>
        <Typography gutterBottom>
          Mode
          <InfoDialog title={`${title} Mode`} content={infoContent.mode} />
        </Typography>
        <FormControl component="fieldset" fullWidth margin="normal">
          <RadioGroup
            row
            value={policy.mode}
            onChange={(e) => handleFieldChange('mode', e.target.value as StackMode)}
          >
            {Object.values(StackMode).filter(m => m !== StackMode.FILTERED).map((mode) => (
              <FormControlLabel key={mode} value={mode} control={<Radio />} label={mode} />
            ))}
          </RadioGroup>
          {(policy.mode === StackMode.FIRST_N || policy.mode === StackMode.AFTER_N) && (
            <TextField
              label="N (Turns)"
              type="number"
              value={policy.n}
              onChange={(e) => handleFieldChange('n', parseInt(e.target.value))}
              sx={{ mt: 1, width: '150px' }}
              inputProps={{ min: 0 }}
            />
          )}
        </FormControl>

        <Typography gutterBottom sx={{ mt: 2 }}>
          Filtering
          <InfoDialog title={`${title} Filtering`} content={infoContent.filtering} />
        </Typography>
        <FormControl fullWidth>
          <InputLabel id={`${title}-filtering-label`}>Filtering</InputLabel>
          <Select
            labelId={`${title}-filtering-label`}
            value={policy.filtering}
            label="Filtering"
            onChange={(e) => handleFieldChange('filtering', e.target.value as FilterMode)}
          >
            {Object.values(FilterMode).map((mode) => (
              <MenuItem key={mode} value={mode}>{mode}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
    </Box>
  );
};