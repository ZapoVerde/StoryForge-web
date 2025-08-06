// src/ui/screens/SettingsScreen.tsx
import React from 'react';
import {
  Box, Typography, Button, AppBar, Toolbar, IconButton, List, ListItem,
  Paper, Divider, CircularProgress, Alert, TextField, Switch, FormControlLabel,
  Snackbar, Dialog, DialogTitle, DialogContent, DialogActions, ListItemButton,
  Stack, Select, MenuItem, InputLabel, FormControl, Card, CardActionArea, Grid,
  ListSubheader, InputAdornment, ListItemText, Tooltip,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import WifiTetheringIcon from '@mui/icons-material/WifiTethering';
import { useSettingsLogic } from '../../utils/hooks/useSettingsLogic';
import { InfoDialog } from '../components/InfoDialog';
import { CollapsibleSection } from '../components/CollapsibleSection';

const SettingsScreen: React.FC<{ onNavToggle: () => void }> = ({ onNavToggle }) => {
  const {
    aiConnections, selectedConnectionId, isLoadingConnections, connectionsError,
    useDummyNarrator, themeMode, setUseDummyNarrator, setThemeMode,
    isDialogOpen, dialogStep, editingConnection, isFetchingModels, testStatus, snackbar, templates,
    modelSearchTerm, setModelSearchTerm, filteredModels,
    handleOpenDialog, handleCloseDialog, handleLoadTemplate, handleUpdateEditingConnection, 
    handleFetchModels, handleSaveAndTest, handleDelete, closeSnackbar, setSelectedConnectionId, handleTest,
    
    // NEW state and handlers for the info dialog
    modelInfo, openModelInfo, handleOpenModelInfo, handleCloseModelInfo,
  } = useSettingsLogic();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', p: 2 }}>
      <AppBar position="static" elevation={1}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>Settings</Typography>
          <IconButton edge="end" color="inherit" aria-label="menu" onClick={onNavToggle}><MenuIcon /></IconButton>
        </Toolbar>
      </AppBar>

      {connectionsError && <Alert severity="error" sx={{ m: 2 }}>Error: {connectionsError}</Alert>}
      
      {isLoadingConnections && aiConnections.length === 0 && <CircularProgress sx={{ m: 2 }} />}

      <Paper sx={{ mt: 2, p: 2 }}>
        <Typography variant="h6" gutterBottom>Global Settings</Typography>
        <FormControlLabel control={<Switch checked={useDummyNarrator} onChange={(e) => setUseDummyNarrator(e.target.checked)} />} label="Use Dummy Narrator (for offline testing)" />
        <Divider sx={{ my: 1 }} />
        <FormControlLabel control={<Switch checked={themeMode === 'dark'} onChange={(e) => setThemeMode(e.target.checked ? 'dark' : 'light')} />} label="Dark Mode" />
      </Paper>
      
      <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>AI Connections</Typography>
      <Paper elevation={1} sx={{ flexGrow: 1, overflowY: 'auto' }}>
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
      <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()} sx={{ mt: 2 }}>
        Add New Connection
      </Button>

      <Dialog open={isDialogOpen} onClose={handleCloseDialog} fullWidth maxWidth="md" transitionDuration={{ enter: 200, exit: 0 }}>
        <DialogTitle>
          {dialogStep === 'select' ? 'Add a New Connection' : (editingConnection?.displayName || 'Connection Details')}
        </DialogTitle>
        <DialogContent>
          {dialogStep === 'select' && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Typography>Start with a template for a popular provider.</Typography>
              <Grid container spacing={2}>
                {Object.entries(templates).filter(([key]) => key !== 'custom').map(([key, template]) => (
                  <Grid item xs={12} sm={6} key={key}>
                    <Card variant="outlined">
                      <CardActionArea onClick={() => handleLoadTemplate(key)} sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="h6">{template.displayName}</Typography>
                      </CardActionArea>
                    </Card>
                  </Grid>
                ))}
              </Grid>
              <Divider>OR</Divider>
              <Button variant="outlined" onClick={() => handleLoadTemplate('custom')}>Start with a Blank Custom Connection</Button>
            </Stack>
          )}

          {dialogStep === 'details' && editingConnection && (
            <Stack spacing={2.5} sx={{ mt: 1 }}>
              <TextField label="Connection Name" value={editingConnection.displayName} onChange={(e) => handleUpdateEditingConnection({ displayName: e.target.value })} autoFocus fullWidth />
              <TextField label="API Token (Key)" value={editingConnection.apiToken} onChange={(e) => handleUpdateEditingConnection({ apiToken: e.target.value })} fullWidth type="password" />

              <FormControl fullWidth>
                <InputLabel id="model-select-label">Model</InputLabel>
                <Select
                  labelId="model-select-label"
                  value={editingConnection.modelSlug}
                  label="Model"
                  onChange={(e) => {
                    const selectedModel = filteredModels.find(m => m.id === e.target.value);
                    handleUpdateEditingConnection({ modelSlug: e.target.value, modelName: selectedModel?.name || e.target.value });
                  }}
                  MenuProps={{ autoFocus: false }}
                >
                  <ListSubheader>
                    <TextField size="small" autoFocus placeholder="Type to filter models..." fullWidth
                      InputProps={{startAdornment: (<InputAdornment position="start"><SearchIcon /></InputAdornment>)}}
                      onChange={(e) => setModelSearchTerm(e.target.value)} onKeyDown={(e) => e.stopPropagation()} />
                  </ListSubheader>
                  {filteredModels.map(model => (
                    <MenuItem key={model.id} value={model.id}>
                      <Tooltip title={model.description || 'No description available.'} placement="right" enterDelay={500}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                          <ListItemText primary={model.name} secondary={model.id} />
                          <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleOpenModelInfo(model); }} sx={{ display: { xs: 'flex', md: 'none' } }}>
                            <InfoOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </Tooltip>
                    </MenuItem>
                  ))}
                  {filteredModels.length === 0 && <MenuItem disabled>No models match your search.</MenuItem>}
                </Select>
              </FormControl>
              
              {templates[editingConnection.displayName.toLowerCase()]?.supportsModelDiscovery && (
                <Button onClick={handleFetchModels} disabled={isFetchingModels} variant="outlined">
                  {isFetchingModels ? <CircularProgress size={24} /> : `Fetch All ${editingConnection.displayName} Models`}
                </Button>
              )}
              
              <CollapsibleSection title="Advanced Options" initiallyExpanded={false}>
                 <Stack spacing={2.5} sx={{mt: 2}}>
                    <TextField label="API URL" value={editingConnection.apiUrl} onChange={(e) => handleUpdateEditingConnection({ apiUrl: e.target.value })} fullWidth />
                    <TextField label="User Agent" value={editingConnection.userAgent || ''} onChange={(e) => handleUpdateEditingConnection({ userAgent: e.target.value })} fullWidth />
                    <FormControlLabel control={<Switch checked={editingConnection.functionCallingEnabled} onChange={(e) => handleUpdateEditingConnection({ functionCallingEnabled: e.target.checked })} />}
                        label="Function Calling Enabled" />
                 </Stack>
              </CollapsibleSection>
              
              {testStatus && <Alert severity={testStatus.type} sx={{ mt: 1 }}>{testStatus.text}</Alert>}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: '16px 24px' }}>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          {dialogStep === 'details' && (
            <Stack direction="row" spacing={1}>
              <Button onClick={handleTest} startIcon={<WifiTetheringIcon />}>Test</Button>
              <Button onClick={handleSaveAndTest} variant="contained">Save Connection</Button>
            </Stack>
          )}
        </DialogActions>
      </Dialog>
      
      <Dialog open={openModelInfo} onClose={handleCloseModelInfo}>
        <DialogTitle>{modelInfo?.name}</DialogTitle>
        <DialogContent>
            <Typography variant="body1">{modelInfo?.description || "No description available."}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{mt: 2, display: 'block'}}>ID: {modelInfo?.id}</Typography>
        </DialogContent>
        <DialogActions>
            <Button onClick={handleCloseModelInfo}>Close</Button>
        </DialogActions>
      </Dialog>
      
      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={closeSnackbar}>
        <Alert onClose={closeSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default SettingsScreen;