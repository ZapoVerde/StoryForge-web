// src/ui/screens/SettingsScreen.tsx
import React from 'react';
import {
  Box, Typography, Button, AppBar, Toolbar, IconButton, List, ListItem, ListItemText,
  Paper, Divider, CircularProgress, Alert, TextField, Switch, FormControlLabel,
  Snackbar, Dialog, DialogTitle, DialogContent, DialogActions, ListItemButton,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import WifiIcon from '@mui/icons-material/Wifi';
import { useSettingsLogic } from '../../utils/hooks/useSettingsLogic';

interface SettingsScreenProps {
  onNavToggle: () => void;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ onNavToggle }) => {
  const {
    aiConnections, selectedConnectionId, isLoadingConnections, connectionsError,
    useDummyNarrator, themeMode, setUseDummyNarrator, setThemeMode,
    isDialogOpen, editingConnection, testStatus, snackbar,
    handleOpenDialog, handleCloseDialog, handleUpdateEditingConnection,
    handleSave, handleDelete, handleTest, closeSnackbar, setSelectedConnectionId,
  } = useSettingsLogic();

  if (isLoadingConnections && aiConnections.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress /> <Typography variant="h6" ml={2}>Loading Settings...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', p: 2 }}>
      <AppBar position="static" elevation={1}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>Settings</Typography>
          <IconButton edge="end" color="inherit" aria-label="menu" onClick={onNavToggle}><MenuIcon /></IconButton>
        </Toolbar>
      </AppBar>

      {connectionsError && <Alert severity="error" sx={{ m: 2 }}>Error: {connectionsError}</Alert>}

      <Paper sx={{ mt: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
        <Typography variant="h6" gutterBottom>Application Settings</Typography>
        <FormControlLabel control={<Switch checked={useDummyNarrator} onChange={(e) => setUseDummyNarrator(e.target.checked)} />} label="Use Dummy Narrator (for testing)" />
        <Divider sx={{ my: 2 }} />
        <FormControlLabel control={<Switch checked={themeMode === 'dark'} onChange={(e) => setThemeMode(e.target.checked ? 'dark' : 'light')} />} label="Dark Mode" />
      </Paper>

      <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>AI Connections</Typography>
      <Paper elevation={1} sx={{ flexGrow: 1, overflowY: 'auto', mb: 2 }}>
        <List>
          {aiConnections.map((conn) => (
            <React.Fragment key={conn.id}>
              <ListItem
                disablePadding
                secondaryAction={
                  <Box>
                    <IconButton edge="end" aria-label="edit" onClick={() => handleOpenDialog(conn)}><EditIcon fontSize="small" /></IconButton>
                    <IconButton edge="end" aria-label="delete" onClick={() => handleDelete(conn.id)}><DeleteIcon fontSize="small" color="error" /></IconButton>
                  </Box>
                }
              >
                <ListItemButton selected={selectedConnectionId === conn.id} onClick={() => setSelectedConnectionId(conn.id)}>
                  <ListItemText primary={conn.displayName} secondary={`${conn.modelName} (${conn.apiUrl.substring(0, 30)}...)`} />
                </ListItemButton>
              </ListItem>
              <Divider />
            </React.Fragment>
          ))}
        </List>
      </Paper>

      <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog(null)} sx={{ mb: 2 }}>Add New Connection</Button>

      {editingConnection && (
        <Dialog open={isDialogOpen} onClose={handleCloseDialog} fullWidth maxWidth="sm">
          <DialogTitle>{editingConnection.id ? 'Edit AI Connection' : 'Add New AI Connection'}</DialogTitle>
          <DialogContent>
            <TextField autoFocus margin="dense" label="Connection Name" type="text" fullWidth value={editingConnection.displayName} onChange={(e) => handleUpdateEditingConnection({ displayName: e.target.value })} sx={{ mb: 2 }} />
            <TextField margin="dense" label="API URL" type="url" fullWidth value={editingConnection.apiUrl} onChange={(e) => handleUpdateEditingConnection({ apiUrl: e.target.value })} sx={{ mb: 2 }} />
            <TextField margin="dense" label="API Token" type="password" fullWidth value={editingConnection.apiToken} onChange={(e) => handleUpdateEditingConnection({ apiToken: e.target.value })} sx={{ mb: 2 }} />
            <TextField margin="dense" label="Model Name (Display)" type="text" fullWidth value={editingConnection.modelName} onChange={(e) => handleUpdateEditingConnection({ modelName: e.target.value })} sx={{ mb: 2 }} />
            <TextField margin="dense" label="Model Slug (API ID)" type="text" fullWidth value={editingConnection.modelSlug} onChange={(e) => handleUpdateEditingConnection({ modelSlug: e.target.value })} sx={{ mb: 2 }} />
            <TextField margin="dense" label="User Agent (Optional)" type="text" fullWidth value={editingConnection.userAgent || ''} onChange={(e) => handleUpdateEditingConnection({ userAgent: e.target.value })} sx={{ mb: 2 }} />
            <FormControlLabel control={<Switch checked={editingConnection.functionCallingEnabled} onChange={(e) => handleUpdateEditingConnection({ functionCallingEnabled: e.target.checked })} />} label="Enable Function Calling" />
            <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Button variant="outlined" startIcon={<WifiIcon />} onClick={handleTest}>Test</Button>
              {testStatus && <Typography variant="body2">{testStatus}</Typography>}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSave} variant="contained">Save</Button>
          </DialogActions>
        </Dialog>
      )}

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={closeSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={closeSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default SettingsScreen;