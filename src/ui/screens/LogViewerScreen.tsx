// src/ui/screens/LogViewerScreen.tsx

import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Alert, Fab, Popover,
  List, ListItem, ListItemIcon, ListItemText, Checkbox
} from '@mui/material';
import TuneIcon from '@mui/icons-material/Tune'; // A more fitting icon for "views/filters"
import { useLogStore } from '../../state/useLogStore';
import { useGameStateStore } from '../../state/useGameStateStore';
import { LogViewMode } from '../../utils/types';
import { DetailedLogTurnView } from '../components/DetailedLogTurnView';

export const LogViewerScreen: React.FC = () => {
  const { logEntries, selectedLogViewModes, setLogEntries, setSelectedLogViewModes } = useLogStore();
  const currentSnapshot = useGameStateStore(state => state.currentSnapshot);

  // The critical synchronization effect
  useEffect(() => {
    setLogEntries(currentSnapshot?.logs || []);
  }, [currentSnapshot, setLogEntries]);

  // State for the Popover menu
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const isMenuOpen = Boolean(anchorEl);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleCheckboxChange = (mode: LogViewMode) => {
    const newSelection = selectedLogViewModes.includes(mode)
      ? selectedLogViewModes.filter((m) => m !== mode)
      : [...selectedLogViewModes, mode];
    setSelectedLogViewModes(newSelection);
  };

  return (
    // Use position relative to anchor the floating button
    <Box sx={{ position: 'relative', height: '100%', p: 2 }}>
      <Typography variant="h5" component="h1" sx={{ mb: 2, textAlign: 'center' }}>
        Game Log
      </Typography>

      <Paper elevation={2} sx={{ height: 'calc(100% - 60px)', overflowY: 'auto' }}>
        {logEntries.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">No log entries to display.</Typography>
          </Box>
        ) : (
          logEntries.map((entry) => (
            <Box key={entry.turnNumber} sx={{ p: 1 }}>
              <DetailedLogTurnView
                entry={entry}
                selectedLogViewModes={selectedLogViewModes}
              />
            </Box>
          ))
        )}
      </Paper>

      {/* Floating Action Button (FAB) for the menu */}
      <Fab
        color="primary"
        aria-label="log views"
        onClick={handleMenuClick}
        sx={{ position: 'absolute', bottom: 32, right: 32 }}
      >
        <TuneIcon />
      </Fab>

      {/* Popover Menu - Non-blocking */}
      <Popover
        open={isMenuOpen}
        anchorEl={anchorEl}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Paper sx={{ width: 320 }}>
          <List dense>
          {logEntries.map((entry) => (
            <Box key={entry.turnNumber} sx={{ p: 1 }}>
              <DetailedLogTurnView // <-- This is the main component to use
                entry={entry}
                selectedLogViewModes={selectedLogViewModes}
              />
            </Box>
          ))}
          </List>
        </Paper>
      </Popover>
    </Box>
  );
};