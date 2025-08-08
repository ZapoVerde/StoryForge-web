// src/ui/components/TurnNavigator.tsx
import React from 'react';
import { Box, IconButton, Typography, Tooltip } from '@mui/material';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';

interface TurnNavigatorProps {
  currentTurn: number;
  maxTurn: number;
  onNavigate: (turn: number) => void;
  isLoading: boolean;
}

export const TurnNavigator: React.FC<TurnNavigatorProps> = ({
  currentTurn,
  maxTurn,
  onNavigate,
  isLoading,
}) => {
  const canGoBack = currentTurn > 0;
  const canGoForward = currentTurn < maxTurn;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 1, gap: 2, backgroundColor: 'action.selected', borderRadius: 2 }}>
      <Tooltip title="Previous Turn">
        <span>
          <IconButton onClick={() => onNavigate(currentTurn - 1)} disabled={!canGoBack || isLoading}>
            <ArrowBackIosNewIcon />
          </IconButton>
        </span>
      </Tooltip>
      <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
        Turn {currentTurn} / {maxTurn}
      </Typography>
      <Tooltip title="Next Turn">
        <span>
          <IconButton onClick={() => onNavigate(currentTurn + 1)} disabled={!canGoForward || isLoading}>
            <ArrowForwardIosIcon />
          </IconButton>
        </span>
      </Tooltip>
    </Box>
  );
};