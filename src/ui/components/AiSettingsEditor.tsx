
import React from 'react';
import {
  Box,
  Typography,
  Slider,
  Switch,
  FormControlLabel,
  Divider,
  TextField,
  MenuItem,
} from '@mui/material';
import type { AiSettings, AiConnection } from '../../models/index';
import { CollapsibleSection } from './CollapsibleSection';

interface AiSettingsEditorProps {
  label: string;
  settings: AiSettings;
  onSettingsChange: (updatedSettings: AiSettings) => void;
  availableConnections: AiConnection[];
}

export const AiSettingsEditor: React.FC<AiSettingsEditorProps> = ({
  label,
  settings,
  onSettingsChange,
  availableConnections,
}) => {
  const handleSliderChange = (
    prop: keyof AiSettings,
    newValue: number | number[]
  ) => {
    onSettingsChange({ ...settings, [prop]: newValue as number });
  };

  const handleSwitchChange = (prop: keyof AiSettings, checked: boolean) => {
    onSettingsChange({ ...settings, [prop]: checked });
  };

  const handleConnectionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onSettingsChange({ ...settings, selectedConnectionId: event.target.value });
  };

  return (
    <CollapsibleSection title={label} initiallyExpanded={false}>
      <TextField
        select
        fullWidth
        label="AI Connection"
        value={settings.selectedConnectionId}
        onChange={handleConnectionChange}
        variant="outlined"
        sx={{ mb: 2 }}
      >
        {availableConnections.map((conn) => (
          <MenuItem key={conn.id} value={conn.id}>
            {conn.modelName} ({conn.id})
          </MenuItem>
        ))}
      </TextField>

      <Typography gutterBottom>
        Temperature: {settings.temperature.toFixed(2)}
      </Typography>
      <Slider
        value={settings.temperature}
        onChange={(_e, val) => handleSliderChange('temperature', val)}
        min={0.0}
        max={1.5}
        step={0.01}
        valueLabelDisplay="auto"
      />
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Controls randomness. Low = logical, high = creative. RPG-optimal:
        0.7–1.0.
      </Typography>

      <Typography gutterBottom>Top P: {settings.topP.toFixed(2)}</Typography>
      <Slider
        value={settings.topP}
        onChange={(_e, val) => handleSliderChange('topP', val)}
        min={0.0}
        max={1.0}
        step={0.01}
        valueLabelDisplay="auto"
      />
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Controls diversity. Lower = focused, higher = expressive. RPG-optimal:
        0.8–1.0.
      </Typography>

      <Typography gutterBottom>Max Tokens: {settings.maxTokens}</Typography>
      <Slider
        value={settings.maxTokens}
        onChange={(_e, val) => handleSliderChange('maxTokens', val)}
        min={256}
        max={8192}
        step={256}
        valueLabelDisplay="auto"
      />
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Maximum length of AI reply. Longer = more story depth. RPG-optimal:
        1024–4096.
      </Typography>

      <Typography gutterBottom>
        Presence Penalty: {settings.presencePenalty.toFixed(2)}
      </Typography>
      <Slider
        value={settings.presencePenalty}
        onChange={(_e, val) => handleSliderChange('presencePenalty', val)}
        min={-2.0}
        max={2.0}
        step={0.01}
        valueLabelDisplay="auto"
      />
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Discourages introducing new topics repeatedly. RPG-optimal: 0.0–0.5.
      </Typography>

      <Typography gutterBottom>
        Frequency Penalty: {settings.frequencyPenalty.toFixed(2)}
      </Typography>
      <Slider
        value={settings.frequencyPenalty}
        onChange={(_e, val) => handleSliderChange('frequencyPenalty', val)}
        min={-2.0}
        max={2.0}
        step={0.01}
        valueLabelDisplay="auto"
      />
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Discourages repeating phrases. Helps avoid spam. RPG-optimal: 0.2–0.8.
      </Typography>

      <Divider sx={{ my: 2 }} />

      <FormControlLabel
        control={
          <Switch
            checked={settings.functionCallingEnabled}
            onChange={(e) =>
              handleSwitchChange('functionCallingEnabled', e.target.checked)
            }
          />
        }
        label="Enable Function Calling"
      />
      <Typography variant="body2" color="text.secondary">
        Allows AI to call structured functions (if you've defined them in the
        prompt).
      </Typography>

      <FormControlLabel // NEW: Typing Effect Setting
        control={
          <Switch
            checked={settings.enableTypingEffect}
            onChange={(e) =>
              handleSwitchChange('enableTypingEffect', e.target.checked)
            }
          />
        }
        label="Enable Typing Effect for AI Output"
      />
      <Typography variant="body2" color="text.secondary">
        Displays AI-generated narrative text one character at a time, like it's being typed.
      </Typography>
    </CollapsibleSection>
  );
};