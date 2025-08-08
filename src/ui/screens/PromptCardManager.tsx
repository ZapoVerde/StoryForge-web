// src/ui/screens/PromptCardManager.tsx
import React from 'react';
import {
  Box, Typography, Paper, CircularProgress, Alert, Dialog,
  DialogTitle, DialogContent, DialogActions, Button, TextField, Snackbar,
} from '@mui/material';
import { useAuthStore } from '../../state/useAuthStore';
import { usePromptCardManagerLogic } from '../../utils/hooks/usePromptCardManagerLogic';
import { PromptCardListPanel } from '../components/PromptCardListPanel';
import { PromptCardEditorPanel } from '../components/PromptCardEditorPanel';

const PromptCardManager: React.FC = () => {
  const { user } = useAuthStore();
  const {
    isLoading, error, promptCards, activePromptCard, localEditedCard, isCardDirty,
    aiConnections, saveDialog, snackbar,
    handleCardSelect, handleLocalCardChange, handleSaveCard, handleRevert,
    handleNewCard, handleDeleteCard, handleDuplicateCard, handleImport,
    handleExport, handleStartGame, setSaveDialog, setSaveAsNewTitle, closeSnackbar,
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
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 2 }}>
      <Typography variant="h5" component="h1" sx={{ mb: 2 }}>
        Prompt Cards Manager
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden', gap: 2 }}>
        <Paper elevation={1} sx={{ flex: 1, minWidth: 300, maxWidth: 450, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <PromptCardListPanel
            cards={promptCards}
            activeCardId={activePromptCard?.id || null}
            onSelectCard={handleCardSelect}
            onDeleteCard={handleDeleteCard}
            onDuplicateCard={handleDuplicateCard}
            onExportCard={handleExport}
            onNewCard={handleNewCard}
            onImport={handleImport}
          />
        </Paper>

        <Paper elevation={1} sx={{ flex: 2, minWidth: 400, overflowY: 'auto' }}>
          <PromptCardEditorPanel
            localEditedCard={localEditedCard}
            isCardDirty={isCardDirty}
            availableConnections={aiConnections}
            onCardChange={handleLocalCardChange}
            onRevert={handleRevert}
            onSave={() => handleSaveCard(false)}
            onSaveAs={() => setSaveDialog(true)}
            onStartGame={handleStartGame}
          />
        </Paper>
      </Box>

      <Dialog open={saveDialog.open} onClose={() => setSaveDialog(false)}>
        <DialogTitle>Save As New Card</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="New Title"
            type="text"
            fullWidth
            variant="outlined"
            value={saveDialog.title}
            onChange={(e) => setSaveAsNewTitle(e.target.value)}
            placeholder={`${localEditedCard?.title} (Copy)`}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialog(false)}>Cancel</Button>
          <Button onClick={() => handleSaveCard(true)}>Save</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={closeSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={closeSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PromptCardManager;