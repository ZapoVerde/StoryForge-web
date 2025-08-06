// src/ui/screens/LogViewerScreen.tsx
import React from 'react';
import {
  Box, Typography, Button, AppBar, Toolbar, IconButton, Menu, MenuItem,
  Checkbox, FormControlLabel, Paper, CircularProgress, Alert,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { useLogViewerLogic } from '../../utils/hooks/useLogViewerLogic';
import { LogViewMode } from '../../utils/types';
import { CollapsibleLogEntry } from '../components/CollapsibleLogEntry';

interface LogViewerScreenProps {
  onNavToggle: () => void;
}

const LogViewerScreen: React.FC<LogViewerScreenProps> = ({ onNavToggle }) => {
  const {
    logEntries, selectedLogViewModes, isLoading, error,
    menuAnchorEl, isMenuOpen, handleMenuClick, handleMenuClose, handleCheckboxChange,
  } = useLogViewerLogic();

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress /> <Typography variant="h6" ml={2}>Loading Logs...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', p: 2 }}>
      <AppBar position="static" elevation={1}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>Log Review</Typography>
          <Button color="inherit" onClick={handleMenuClick}>Log Views ▼</Button>
          <IconButton edge="end" color="inherit" aria-label="menu" onClick={onNavToggle}><MenuIcon /></IconButton>
        </Toolbar>
      </AppBar>

      <Menu anchorEl={menuAnchorEl} open={isMenuOpen} onClose={handleMenuClose}>
        {Object.values(LogViewMode).map((mode) => (
          <MenuItem key={mode} onClick={() => handleCheckboxChange(mode)}>
            <FormControlLabel
              control={<Checkbox checked={selectedLogViewModes.includes(mode)} />}
              label={mode}
              sx={{ pointerEvents: 'none' }} // Let the MenuItem handle the click
            />
          </MenuItem>
        ))}
      </Menu>

      {error && <Alert severity="error" sx={{ m: 2 }}>Error: {error}</Alert>}

      <Paper elevation={1} sx={{ flexGrow: 1, m: 2, overflowY: 'auto' }}>
        {logEntries.length === 0 ? (
          <Box sx={{ textAlign: 'center', p: 4 }}><Typography color="text.secondary">No log entries for this game yet.</Typography></Box>
        ) : (
          logEntries.map((entry) => (
            <CollapsibleLogEntry
              key={entry.turnNumber}
              entry={entry}
              selectedLogViewModes={selectedLogViewModes}
            />
          ))
        )}
      </Paper>
    </Box>
  );
};

export default LogViewerScreen;