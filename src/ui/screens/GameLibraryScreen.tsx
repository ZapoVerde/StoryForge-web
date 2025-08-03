// src/ui/screens/GameLibraryScreen.tsx

import React, { useEffect, useState } from 'react';
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
  InputAdornment,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { usePromptCardStore } from '../../state/usePromptCardStore';
import { useAuthStore } from '../../state/useAuthStore';
import { useGameStateStore } from '../../state/useGameStateStore';
import { PromptCard } from '../../models/index';

interface GameLibraryScreenProps {
  onNavToggle: () => void;
  // onNavigateToEditor: (cardId?: string) => void; // To navigate to editor with a specific card
}

const GameLibraryScreen: React.FC<GameLibraryScreenProps> = ({ onNavToggle }) => {
  const { user } = useAuthStore();
  const {
    promptCards,
    isLoading,
    error,
    fetchPromptCards,
    setActivePromptCard,
    deletePromptCard,
  } = usePromptCardStore();
  const { initializeGame } = useGameStateStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info'>('info');


  useEffect(() => {
    if (user?.uid) {
      fetchPromptCards(user.uid);
    }
  }, [user?.uid, fetchPromptCards]);

  const filteredCards = promptCards.filter(card =>
    card.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    card.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    card.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleEditCard = (card: PromptCard) => {
    setActivePromptCard(card);
    // TODO: Navigate to PromptCardManager/Editor screen
    setSnackbarMessage(`Editing "${card.title}"`);
    setSnackbarSeverity('info');
    console.log(`Navigating to editor for card: ${card.id}`);
  };

  const handleDeleteCard = async (cardId: string) => {
    if (!user?.uid) return;
    try {
      await deletePromptCard(user.uid, cardId);
      setSnackbarMessage('Card deleted successfully!');
      setSnackbarSeverity('success');
    } catch (e) {
      setSnackbarMessage(`Failed to delete card: ${e instanceof Error ? e.message : 'Unknown error'}`);
      setSnackbarSeverity('error');
    }
  };

  const handleStartGame = async (card: PromptCard) => {
    if (!user?.uid) {
      setSnackbarMessage('Must be logged in to start a game.');
      setSnackbarSeverity('error');
      return;
    }
    try {
      // First, set the active card, then initialize game
      setActivePromptCard(card);
      await initializeGame(user.uid, card.id);
      setSnackbarMessage(`Game "${card.title}" initialized! Navigating to game...`);
      setSnackbarSeverity('success');
      // TODO: Navigate to GameScreen
      console.log(`Game "${card.title}" started! Navigating to GameScreen.`);
    } catch (e) {
      setSnackbarMessage(`Failed to start game: ${e instanceof Error ? e.message : 'Unknown error'}`);
      setSnackbarSeverity('error');
    }
  };


  if (isLoading && !promptCards.length) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
        <Typography variant="h6" ml={2}>Loading Game Library...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', p: 2 }}>
      <AppBar position="static" elevation={1}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Game Library
          </Typography>
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

      <Box sx={{ p: 2 }}>
        <TextField
          fullWidth
          label="Search Cards"
          variant="outlined"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
        />
        {/* Placeholder for "New Card" button, which we decided would be on PromptCardManager */}
        {/* <Button variant="contained" startIcon={<AddIcon />} sx={{ mb: 2 }}>
          Create New Card
        </Button> */}
      </Box>

      <Paper elevation={1} sx={{ flexGrow: 1, m: 2, overflowY: 'auto' }}>
        {filteredCards.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center', mt: 4 }}>
            <Typography variant="body1" color="text.secondary">
              {searchTerm ? "No cards match your search." : "No cards available. Go to Prompt Cards to create one!"}
            </Typography>
          </Box>
        ) : (
          <List>
            {filteredCards.map((card) => (
              <React.Fragment key={card.id}>
                <ListItem
                  secondaryAction={
                    <Box>
                      <IconButton edge="end" aria-label="start-game" onClick={() => handleStartGame(card)}>
                        <PlayArrowIcon color="primary" />
                      </IconButton>
                      <IconButton edge="end" aria-label="edit-card" onClick={() => handleEditCard(card)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton edge="end" aria-label="delete-card" onClick={() => handleDeleteCard(card.id)}>
                        <DeleteIcon color="error" />
                      </IconButton>
                    </Box>
                  }
                >
                  <ListItemText
                    primary={card.title}
                    secondary={card.description || 'No description'}
                    primaryTypographyProps={{ fontWeight: 'medium' }}
                  />
                </ListItem>
                <Divider component="li" />
              </React.Fragment>
            ))}
          </List>
        )}
      </Paper>
      <Snackbar
        open={!!snackbarMessage}
        autoHideDuration={6000}
        onClose={() => setSnackbarMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbarMessage(null)} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default GameLibraryScreen;