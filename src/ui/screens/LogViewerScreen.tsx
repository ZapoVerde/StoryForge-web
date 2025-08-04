// src/ui/screens/LogViewerScreen.tsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  AppBar,
  Toolbar,
  IconButton,
  Menu,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Paper,
  CircularProgress,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { useLogStore } from '../../state/useLogStore';
import { LogViewMode } from '../../utils/types';
import { useGameStateStore } from '../../state/useGameStateStore';
// import { LogEntryDisplay } from '../components/LogEntryDisplay'; // Removed direct import
import { CollapsibleLogEntry } from '../components/CollapsibleLogEntry'; // NEW: Import CollapsibleLogEntry
import { AutoSizer, List } from 'react-virtualized'; // For efficient list rendering

interface LogViewerScreenProps {
  onNavToggle: () => void;
}

const LogViewerScreen: React.FC<LogViewerScreenProps> = ({ onNavToggle }) => {
  const { logEntries, selectedLogViewModes, isLoading, error, setSelectedLogViewModes, setLogEntries } = useLogStore();
  const { currentSnapshot } = useGameStateStore(); // Access logs from here initially

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  useEffect(() => {
    // When the current game snapshot changes, update the logs in the log store
    if (currentSnapshot) {
      setLogEntries(currentSnapshot.logs);
    } else {
      setLogEntries([]);
    }
  }, [currentSnapshot, setLogEntries]);


  const handleMenuClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleCheckboxChange = (mode: LogViewMode, checked: boolean) => {
    const newSelection = checked
      ? [...selectedLogViewModes, mode]
      : selectedLogViewModes.filter((m) => m !== mode);
    setSelectedLogViewModes(newSelection);
  };

  // Virtualized list row renderer
  const rowRenderer = ({ index, key, style }: { index: number; key: string; style: React.CSSProperties }) => {
    const entry = logEntries[index];
    if (!entry) return null; // Should not happen with proper list management

    return (
      <Box key={key} style={style} sx={{ p: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
        {/* Render the new CollapsibleLogEntry component for each row */}
        <CollapsibleLogEntry entry={entry} selectedLogViewModes={selectedLogViewModes} />
      </Box>
    );
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
        <Typography variant="h6" ml={2}>Loading Logs...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <AppBar position="static" elevation={1}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Log Review
          </Typography>
          <Button color="inherit" onClick={handleMenuClick}>
            Log Views ▼
          </Button>
          <Menu
            anchorEl={anchorEl}
            open={open}
            onClose={handleMenuClose}
            MenuListProps={{
              'aria-labelledby': 'basic-button',
            }}
          >
            {Object.values(LogViewMode).map((mode) => (
              <MenuItem key={mode} onClick={() => handleCheckboxChange(mode, !selectedLogViewModes.includes(mode))}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={selectedLogViewModes.includes(mode)}
                      onChange={() => {}} // Handled by MenuItem's onClick
                      name={mode}
                    />
                  }
                  label={mode}
                />
              </MenuItem>
            ))}
          </Menu>
          <IconButton edge="end" color="inherit" aria-label="menu" onClick={onNavToggle}>
            <MenuIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {error && (
        <Alert severity="error" sx={{ m: 2 }}>
          Error: {error}
        </Alert>
      )}

      {selectedLogViewModes.length === 0 ? (
        <Box sx={{ p: 3, textAlign: 'center', mt: 4 }}>
          <Typography variant="body1" color="text.secondary">
            Please select at least one log view from the "Log Views" menu.
          </Typography>
        </Box>
      ) : (
        <Paper
          elevation={1}
          sx={{
            flexGrow: 1,
            m: 2,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0, // ensures child flex containers can shrink
          }}
        >
          {/* Fixed header inside Paper */}
          <Box sx={{ p: 1, borderBottom: '1px solid', borderColor: 'divider', textAlign: 'center' }}>
            <Typography variant="subtitle1" color="text.primary">
              Showing: {selectedLogViewModes.join(' | ')}
            </Typography>
          </Box>

          {/* Scrollable log list */}
          <Box sx={{ flex: 1, overflowY: 'auto' }}>
            {logEntries.map((entry, index) => (
              <Box key={index} sx={{ p: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                <CollapsibleLogEntry
                  entry={entry}
                  selectedLogViewModes={selectedLogViewModes}
                />
              </Box>
            ))}
          </Box>

        </Paper>

      )}
    </Box>
  );
};

export default LogViewerScreen;