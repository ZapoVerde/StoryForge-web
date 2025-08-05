// src/ui/components/stackInstructions/TokenPolicyEditor.tsx
import React from 'react';
import { Box, Typography, TextField } from '@mui/material';
import { TokenPolicy } from '../../../models';
import { InfoDialog } from '../InfoDialog';

interface TokenPolicyEditorProps {
  tokenPolicy: TokenPolicy;
  onPolicyChange: (updatedPolicy: TokenPolicy) => void;
}

export const TokenPolicyEditor: React.FC<TokenPolicyEditorProps> = ({
  tokenPolicy,
  onPolicyChange,
}) => {
  const handleFieldChange = (field: keyof TokenPolicy, value: any) => {
    onPolicyChange({ ...tokenPolicy, [field]: value });
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Token Policy
      </Typography>
      <TextField
        fullWidth
        label="Min Tokens"
        type="number"
        value={tokenPolicy.minTokens}
        onChange={(e) => handleFieldChange('minTokens', parseInt(e.target.value))}
        sx={{ mb: 2 }}
        inputProps={{ min: 0 }}
        InputProps={{
          endAdornment: <InfoDialog title="Min Tokens" content="The AI will attempt to generate a response of at least this many tokens." />
        }}
      />
      <TextField
        fullWidth
        label="Max Tokens"
        type="number"
        value={tokenPolicy.maxTokens}
        onChange={(e) => handleFieldChange('maxTokens', parseInt(e.target.value))}
        sx={{ mb: 2 }}
        inputProps={{ min: 0 }}
        InputProps={{
          endAdornment: <InfoDialog title="Max Tokens" content="The absolute maximum number of tokens the AI can generate." />
        }}
      />
      <TextField
        fullWidth
        label="Fallback Plan"
        value={tokenPolicy.fallbackPlan.join(', ')}
        onChange={(e) => handleFieldChange('fallbackPlan', e.target.value.split(',').map((s) => s.trim()))}
        sx={{ mb: 2 }}
        InputProps={{
          endAdornment: <InfoDialog title="Fallback Plan" content={`A prioritized, comma-separated list of strategies the system will use to reduce the *input prompt's* token count if it exceeds the AI model's context window.\n\nCommon Strategies:\ndrop_known_entities, drop_low_importance_digest, truncate_expression_logs, drop_narrator_prose, truncate_conversation_history`} />
        }}
      />
    </Box>
  );
};