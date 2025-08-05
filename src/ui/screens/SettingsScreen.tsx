// src/ui/screens/SettingsScreen.tsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  AppBar,
  Toolbar,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Paper,
  Divider,
  CircularProgress,
  Alert,
  TextField,
  Switch,
  FormControlLabel,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  ListItemButton, // Import ListItemButton
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import WifiIcon from '@mui/icons-material/Wifi'; // For testing connection

import { useSettingsStore } from '../../state/useSettingsStore';
import { useAuthStore } from '../../state/useAuthStore';
import { AiConnection } from '../../models/AiConnection';
import { aiClient } from '../../logic/aiClient'; // Import aiClient for connection testing
import { generateUuid } from '../../utils/uuid'; // For generating new connection IDs

interface SettingsScreenProps {
  onNavToggle: () => void;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ onNavToggle }) => {
  const { user } = useAuthStore();
  const {
    aiConnections,
    selectedConnectionId,
    isLoadingConnections,
    connectionsError,
    useDummyNarrator,
    themeMode,
    fetchAiConnections,
    addAiConnection,
    updateAiConnection,
    deleteAiConnection,
    setSelectedConnectionId,
    setUseDummyNarrator,
    setThemeMode,
  } = useSettingsStore();

  const [editingConnection, setEditingConnection] = useState<AiConnection | null>(null);
  const [newConnectionData, setNewConnectionData] = useState<Omit<AiConnection, 'id' | 'createdAt' | 'lastUpdated'> | null>(null);
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info' | 'warning'>('info');

  useEffect(() => {
    if (user?.uid) {
      fetchAiConnections(user.uid);
    }
  }, [user?.uid, fetchAiConnections]);

  // Helper to show snackbar
  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const handleSnackbarClose = (event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  };

  const handleAddConnectionClick = () => {
    setEditingConnection(null); // Clear any existing edit
    setNewConnectionData({
      displayName: '',
      apiUrl: '',
      apiToken: '',
      modelName: '',
      modelSlug: '',
      functionCallingEnabled: false,
      userAgent: 'StoryForge/1.0 (Web)',
    });
    setTestStatus(null);
  };

  const handleEditConnectionClick = (connection: AiConnection) => {
    setEditingConnection({ ...connection }); // Create a mutable copy for editing
    setNewConnectionData(null); // Clear new connection data
    setTestStatus(null);
  };

  const handleDeleteConnectionClick = async (connectionId: string) => {
    if (!user?.uid) return;
    try {
      await deleteAiConnection(user.uid, connectionId);
      showSnackbar('Connection deleted successfully!', 'success');
    } catch (e: any) {
      showSnackbar(`Failed to delete connection: ${e.message}`, 'error');
    }
  };

  const handleSaveConnection = async () => {
    if (!user?.uid) return;

    try {
      if (editingConnection) {
        // Update existing connection
        await updateAiConnection(user.uid, editingConnection);
        showSnackbar('Connection updated successfully!', 'success');
      } else if (newConnectionData) {
        // Add new connection
        await addAiConnection(user.uid, newConnectionData);
        showSnackbar('Connection added successfully!', 'success');
      }
      setEditingConnection(null);
      setNewConnectionData(null);
    } catch (e: any) {
      showSnackbar(`Failed to save connection: ${e.message}`, 'error');
    }
  };

  const handleTestConnection = async (connectionToTest: AiConnection) => {
    setTestStatus('Testing...');
    try {
      const success = await aiClient.testConnection(connectionToTest);
      if (success) {
        setTestStatus('✅ Success!');
        showSnackbar('AI connection test successful!', 'success');
      } else {
        setTestStatus('❌ Failed. Check URL, Token, and Model Slug.');
        showSnackbar('AI connection test failed. See status for details.', 'error');
      }
    } catch (e: any) {
      setTestStatus(`❌ Error: ${e.message}`);
      showSnackbar(`AI connection test error: ${e.message}`, 'error');
    }
  };

  const currentEdited = editingConnection || newConnectionData;

  if (isLoadingConnections) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
        <Typography variant="h6" ml={2}>Loading Settings...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', p: 2 }}>
      <AppBar position="static" elevation={1}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Settings
          </Typography>
          <IconButton edge="end" color="inherit" aria-label="menu" onClick={onNavToggle}>
            <MenuIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {connectionsError && (
        <Alert severity="error" sx={{ m: 2 }}>
          Error: {connectionsError}
        </Alert>
      )}

      <Box sx={{ mt: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
        <Typography variant="h6" gutterBottom>Application Settings</Typography>
        <FormControlLabel
          control={
            <Switch
              checked={useDummyNarrator}
              onChange={(e) => setUseDummyNarrator(e.target.checked)}
            />
          }
          label="Use Dummy Narrator (for testing without AI calls)"
        />
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          When enabled, the game will use a simple, pre-programmed response instead of calling a real AI.
        </Typography>

        <Divider sx={{ my: 2 }} />

        <FormControlLabel
            control={
                <Switch
                    checked={themeMode === 'dark'}
                    onChange={(e) => setThemeMode(e.target.checked ? 'dark' : 'light')}
                />
            }
            label="Dark Mode"
        />
        <Typography variant="body2" color="text.secondary">
            Toggle between light and dark themes.
        </Typography>
      </Box>

      <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>AI Connections</Typography>
      <Paper elevation={1} sx={{ flexGrow: 1, overflowY: 'auto', mb: 2 }}>
        <List>
          {aiConnections.length === 0 ? (
            <ListItem>
              <ListItemText primary="No AI connections configured. Add one below." sx={{ textAlign: 'center', py: 2 }} />
            </ListItem>
          ) : (
            aiConnections.map((conn) => (
              <React.Fragment key={conn.id}>
                {/* CORRECTED: Replaced ListItem with button prop with ListItemButton */}
                <ListItem
                  disablePadding
                  secondaryAction={
                    <Box>
                      <IconButton edge="end" aria-label="edit" onClick={() => handleEditConnectionClick(conn)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton edge="end" aria-label="delete" onClick={() => handleDeleteConnectionClick(conn.id)}>
                        <DeleteIcon fontSize="small" color="error" />
                      </IconButton>
                    </Box>
                  }
                >
                  <ListItemButton
                    selected={selectedConnectionId === conn.id}
                    onClick={() => setSelectedConnectionId(conn.id)}
                  >
                    <ListItemText
                      primary={conn.displayName}
                      secondary={`${conn.modelName} (${conn.apiUrl.substring(0, 30)}...)`}
                    />
                  </ListItemButton>
                </ListItem>
                <Divider />
              </React.Fragment>
            ))
          )}
        </List>
      </Paper>

      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={handleAddConnectionClick}
        sx={{ mb: 2 }}
      >
        Add New Connection
      </Button>

      {/* Connection Edit/Add Dialog */}
      {(editingConnection || newConnectionData) && (
        <Dialog open onClose={() => { setEditingConnection(null); setNewConnectionData(null); setTestStatus(null); }} fullWidth maxWidth="sm">
          <DialogTitle>{editingConnection ? 'Edit AI Connection' : 'Add New AI Connection'}</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Connection Name"
              type="text"
              fullWidth
              variant="outlined"
              value={currentEdited?.displayName || ''}
              onChange={(e) => {
                if (editingConnection) { setEditingConnection({ ...editingConnection, displayName: e.target.value }); }
                else if (newConnectionData) { setNewConnectionData({ ...newConnectionData, displayName: e.target.value }); }
              }}
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              label="API URL"
              type="url"
              fullWidth
              variant="outlined"
              value={currentEdited?.apiUrl || ''}
              onChange={(e) => {
                if (editingConnection) { setEditingConnection({ ...editingConnection, apiUrl: e.target.value }); }
                else if (newConnectionData) { setNewConnectionData({ ...newConnectionData, apiUrl: e.target.value }); }
              }}
              helperText="e.g., https://api.openai.com/v1/ or https://api.deepseek.com/v1/"
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              label="API Token"
              type="password" // Use type="password" for security
              fullWidth
              variant="outlined"
              value={currentEdited?.apiToken || ''}
              onChange={(e) => {
                if (editingConnection) { setEditingConnection({ ...editingConnection, apiToken: e.target.value }); }
                else if (newConnectionData) { setNewConnectionData({ ...newConnectionData, apiToken: e.target.value }); }
              }}
              helperText="Your secret API key (e.g., sk-...)"
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              label="Model Name (Display)"
              type="text"
              fullWidth
              variant="outlined"
              value={currentEdited?.modelName || ''}
              onChange={(e) => {
                if (editingConnection) { setEditingConnection({ ...editingConnection, modelName: e.target.value }); }
                else if (newConnectionData) { setNewConnectionData({ ...newConnectionData, modelName: e.target.value }); }
              }}
              helperText="User-friendly name, e.g., 'GPT-4 Turbo' or 'DeepSeek Coder'"
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              label="Model Slug (API ID)"
              type="text"
              fullWidth
              variant="outlined"
              value={currentEdited?.modelSlug || ''}
              onChange={(e) => {
                if (editingConnection) { setEditingConnection({ ...editingConnection, modelSlug: e.target.value }); }
                else if (newConnectionData) { setNewConnectionData({ ...newConnectionData, modelSlug: e.target.value }); }
              }}
              helperText="The actual model ID used in API requests, e.g., 'gpt-4-turbo' or 'deepseek-coder'"
              sx={{ mb: 2 }}
            />
             <TextField
              margin="dense"
              label="User Agent (Optional)"
              type="text"
              fullWidth
              variant="outlined"
              value={currentEdited?.userAgent || ''}
              onChange={(e) => {
                if (editingConnection) { setEditingConnection({ ...editingConnection, userAgent: e.target.value }); }
                else if (newConnectionData) { setNewConnectionData({ ...newConnectionData, userAgent: e.target.value }); }
              }}
              helperText="Custom User-Agent header for API requests (e.g., 'StoryForge/1.0')"
              sx={{ mb: 2 }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={currentEdited?.functionCallingEnabled || false}
                  onChange={(e) => {
                    if (editingConnection) { setEditingConnection({ ...editingConnection, functionCallingEnabled: e.target.checked }); }
                    else if (newConnectionData) { setNewConnectionData({ ...newConnectionData, functionCallingEnabled: e.target.checked }); }
                  }}
                />
              }
              label="Enable Function Calling"
            />
            <Typography variant="body2" color="text.secondary">
                If the model supports tool use/function calling.
            </Typography>

            <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<WifiIcon />}
                onClick={() => currentEdited && handleTestConnection(currentEdited as AiConnection)}
                disabled={!currentEdited?.apiUrl || !currentEdited?.apiToken || !currentEdited?.modelSlug}
              >
                Test Connection
              </Button>
              {testStatus && (
                <Typography variant="body2" color={testStatus.startsWith('✅') ? 'success.main' : 'error.main'}>
                  {testStatus}
                </Typography>
              )}
            </Box>

          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setEditingConnection(null); setNewConnectionData(null); setTestStatus(null); }}>
              Cancel
            </Button>
            <Button onClick={handleSaveConnection} variant="contained" disabled={!currentEdited?.displayName || !currentEdited?.apiUrl || !currentEdited?.apiToken || !currentEdited?.modelSlug}>
              Save
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Snackbar for general messages */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SettingsScreen;