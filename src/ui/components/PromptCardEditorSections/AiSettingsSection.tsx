// src/ui/components/PromptCardEditorSections/AiSettingsSection.tsx
import React from 'react';
import { Box, Typography, Slider, TextField } from '@mui/material';
import type { AiSettings } from '../../../models';
import { useSettingsStore } from '../../../state/useSettingsStore';

interface AiSettingsSectionProps {
  settings: AiSettings;
  onChange: (newSettings: AiSettings) => void;
}

export const AiSettingsSection: React.FC<AiSettingsSectionProps> = ({ settings, onChange }) => {
  const update = <K extends keyof AiSettings>(key: K, value: AiSettings[K]) => {
    onChange({ ...settings, [key]: value });
  };

  const availableConnections = useSettingsStore((state) => state.aiConnections);
  const selectedConnection = availableConnections.find(
    (conn) => conn.id === settings.selectedConnectionId
  );

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h6" gutterBottom>AI Settings</Typography>

      <Box sx={{ mt: 2 }}>
        <Typography gutterBottom>Model Name</Typography>
        <TextField
          fullWidth
          value={selectedConnection?.modelName || "Unknown"}
          disabled // 👈 Make this readonly
        />
      </Box>


      <Box sx={{ mt: 3 }}>
        <Typography gutterBottom>Temperature: {settings.temperature}</Typography>
        <Slider
          value={settings.temperature}
          min={0}
          max={1.5}
          step={0.05}
          onChange={(_, val) => update('temperature', val as number)}
        />
      </Box>

      <Box sx={{ mt: 3 }}>
        <Typography gutterBottom>Top P: {settings.topP}</Typography>
        <Slider
          value={settings.topP}
          min={0}
          max={1}
          step={0.05}
          onChange={(_, val) => update('topP', val as number)}
        />
      </Box>

      <Box sx={{ mt: 3 }}>
        <Typography gutterBottom>Max Tokens</Typography>
        <TextField
          type="number"
          fullWidth
          value={settings.maxTokens}
          onChange={(e) => update('maxTokens', parseInt(e.target.value) || 0)}
        />
      </Box>

      <Box sx={{ mt: 3 }}>
        <Typography gutterBottom>Presence Penalty: {settings.presencePenalty}</Typography>
        <Slider
          value={settings.presencePenalty}
          min={-2}
          max={2}
          step={0.1}
          onChange={(_, val) => update('presencePenalty', val as number)}
        />
      </Box>

      <Box sx={{ mt: 3 }}>
        <Typography gutterBottom>Frequency Penalty: {settings.frequencyPenalty}</Typography>
        <Slider
          value={settings.frequencyPenalty}
          min={-2}
          max={2}
          step={0.1}
          onChange={(_, val) => update('frequencyPenalty', val as number)}
        />
      </Box>
    </Box>
  );
};
