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
import { LogEntryDisplay } from '../components/LogEntryDisplay'; // Component to render individual log parts
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
        <LogEntryDisplay mode={selectedLogViewModes[0] || LogViewMode.NARRATOR_OUTPUT} entry={entry} />
        {/*
          Currently, this simple stub only displays the first selected mode.
          For multiple modes, you'd iterate `selectedLogViewModes` and render `LogEntryDisplay` for each.
          The Android version used a HorizontalPager, which would be a more complex implementation here
          likely involving a carousel library or custom gesture handling.
          For this stub, we'll keep it simple: assume the user chooses one main view for the list.
          Full fidelity with Android's HorizontalPager for multiple views will require more work later.
        */}
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
        <Paper elevation={1} sx={{ flexGrow: 1, m: 2, overflow: 'hidden' }}>
          <Box sx={{ p: 1, borderBottom: '1px solid', borderColor: 'divider', textAlign: 'center' }}>
            <Typography variant="subtitle1" color="text.primary">
              Showing: {selectedLogViewModes.join(' | ')}
            </Typography>
          </Box>
          {logEntries.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center', mt: 4 }}>
              <Typography variant="body1" color="text.secondary">
                No log entries yet. Play a game to generate logs!
              </Typography>
            </Box>
          ) : (
            <AutoSizer>
              {({ height, width }) => (
                <List
                  height={height}
                  width={width}
                  rowCount={logEntries.length}
                  rowHeight={80} // Placeholder, will need dynamic row heights based on content
                  rowRenderer={rowRenderer}
                  overscanRowCount={5}
                />
              )}
            </AutoSizer>
          )}
        </Paper>
      )}
    </Box>
  );
};

export default LogViewerScreen;