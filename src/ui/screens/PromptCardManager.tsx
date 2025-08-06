// src/ui/screens/PromptCardManager.tsx
import React from 'react';
import {
  Box,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Paper,
  Divider,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Snackbar,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { useAuthStore } from '../../state/useAuthStore';
import { usePromptCardManagerLogic } from '../../utils/hooks/usePromptCardManagerLogic';
import PromptCardEditor from './PromptCardEditor';
import { PromptCard } from '../../models';

interface PromptCardManagerProps {
  onNavToggle: () => void;
}

const PromptCardManager: React.FC<PromptCardManagerProps> = ({ onNavToggle }) => {
  const { user } = useAuthStore();
  const {
    isLoading,
    error,
    promptCards,
    activePromptCard,
    localEditedCard,
    isCardDirty,
    aiConnections,
    saveDialog,
    snackbar,
    handleCardSelect,
    handleLocalCardChange,
    handleSaveCard,
    handleRevert,
    handleNewCard,
    handleDeleteCard,
    handleDuplicateCard,
    handleImport,
    handleExport,
    handleStartGame,
    setSaveDialog,
    setSaveAsNewTitle,
    closeSnackbar,
  } = usePromptCardManagerLogic(user);

  if (isLoading && !promptCards.length) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
        <Typography variant="h6" ml={2}>Loading Prompt Cards...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" component="h1">
          Prompt Cards
        </Typography>
        <IconButton onClick={onNavToggle} aria-label="menu">
          <MenuIcon />
        </IconButton>
      </Box>

      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        <Button variant="contained" onClick={handleNewCard} startIcon={<AddIcon />}>
          New Card
        </Button>
        <Button variant="outlined" component="label" startIcon={<FileUploadIcon />}>
          Import Cards
          <input type="file" hidden accept=".json" onChange={handleImport} multiple/>
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Error: {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden', gap: 2 }}>
        <Paper elevation={1} sx={{ flex: 1, minWidth: 250, maxWidth: 350, overflowY: 'auto' }}>
          <Typography variant="h6" sx={{ p: 2, pb: 1 }}>Your Cards</Typography>
          <Divider />
          <List>
            {promptCards.length === 0 ? (
              <ListItem><ListItemText primary="No cards yet. Create one!" sx={{ textAlign: 'center' }} /></ListItem>
            ) : (
              promptCards.map((card: PromptCard) => (
                <ListItem
                  key={card.id}
                  selected={activePromptCard?.id === card.id}
                  onClick={() => handleCardSelect(card)}
                  sx={{ py: 1, pr: 0, cursor: 'pointer', '&:hover': { backgroundColor: (theme) => theme.palette.action.hover } }}
                >
                  <ListItemText primary={card.title} secondary={card.description || 'No description'} primaryTypographyProps={{ noWrap: true }} secondaryTypographyProps={{ noWrap: true }} />
                  <IconButton edge="end" aria-label="duplicate" onClick={(e) => { e.stopPropagation(); handleDuplicateCard(card.id); }}><ContentCopyIcon fontSize="small" /></IconButton>
                  <IconButton edge="end" aria-label="delete" onClick={(e) => { e.stopPropagation(); handleDeleteCard(card.id); }}><DeleteIcon fontSize="small" color="error" /></IconButton>
                  <IconButton edge="end" aria-label="export" onClick={(e) => { e.stopPropagation(); handleExport(card.id); }}><FileDownloadIcon fontSize="small" /></IconButton>
                </ListItem>
              ))
            )}
          </List>
        </Paper>

        <Paper elevation={1} sx={{ flex: 2, minWidth: 400, overflowY: 'auto' }}>
          {!activePromptCard || !localEditedCard ? (
            <Box sx={{ textAlign: 'center', p: 4, mt: 4 }}>
              <Typography variant="h6" color="text.secondary">Select a card or create a new one to start editing.</Typography>
            </Box>
          ) : (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, borderBottom: '1px solid', borderColor: 'divider', position: 'sticky', top: 0, backgroundColor: 'background.paper', zIndex: 1 }}>
                <Typography variant="h6" component="h2">{localEditedCard.title}</Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {isCardDirty && (
                    <>
                      <Button variant="outlined" onClick={handleRevert}>Revert</Button>
                      <Button variant="contained" onClick={() => handleSaveCard(false)}>Save Changes</Button>
                    </>
                  )}
                  <Button variant="outlined" onClick={() => setSaveDialog(true)}>Save As...</Button>
                  <Button variant="contained" color="primary" onClick={handleStartGame} startIcon={<PlayArrowIcon />} disabled={isCardDirty}>
                    Start Game
                  </Button>
                </Box>
              </Box>
              <PromptCardEditor card={localEditedCard} onCardChange={handleLocalCardChange} availableConnections={aiConnections} />
            </Box>
          )}
        </Paper>
      </Box>

      <Dialog open={saveDialog.open} onClose={() => setSaveDialog(false)}>
        <DialogTitle>Save Prompt Card As New</DialogTitle>
        <DialogContent><TextField autoFocus margin="dense" label="New Card Title" type="text" fullWidth variant="outlined" value={saveDialog.title} onChange={(e) => setSaveAsNewTitle(e.target.value)} placeholder={`${localEditedCard?.title} (Copy)`} /></DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialog(false)}>Cancel</Button>
          <Button onClick={() => handleSaveCard(true)}>Save</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={closeSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={closeSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PromptCardManager;