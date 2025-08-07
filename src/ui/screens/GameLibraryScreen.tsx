import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  AppBar,
  Toolbar,
  List,
  ListItem,
  ListItemText,
  Paper,
  Divider,
  CircularProgress,
  Alert,
  IconButton,
  Snackbar,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import DeleteIcon from '@mui/icons-material/Delete';
import { useAuthStore } from '../../state/useAuthStore';
import { useGameStateStore } from '../../state/useGameStateStore';
import { gameRepository } from '../../data/repositories/gameRepository';
import { useNavigate } from 'react-router-dom';
import type { GameSnapshot } from '../../models';
import { formatIsoDateForDisplay } from '../../utils/formatDate';

const GameLibraryScreen: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { loadGame, gameLoading } = useGameStateStore();

  const [savedGames, setSavedGames] = useState<GameSnapshot[]>([]);
  const [loadingSavedGames, setLoadingSavedGames] = useState(true);
  const [savedGamesError, setSavedGamesError] = useState<string | null>(null);
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info' | 'warning'>('info');
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  const fetchSavedGames = async (userId: string) => {
    setLoadingSavedGames(true);
    setSavedGamesError(null);
    try {
      const games = await gameRepository.getAllGameSnapshots(userId);
      setSavedGames(games);
    } catch (e: any) {
      setSavedGamesError(e.message || 'Failed to fetch saved games.');
    } finally {
      setLoadingSavedGames(false);
    }
  };

  useEffect(() => {
    if (user?.uid) {
      fetchSavedGames(user.uid);
    }
  }, [user?.uid]);

  const showSnackbar = (
    message: string,
    severity: 'success' | 'error' | 'info' | 'warning' = 'info'
  ) => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const handleSnackbarClose = (event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') return;
    setSnackbarOpen(false);
  };

  const handleLoadGame = async (snapshotId: string) => {
    if (!user?.uid) {
      showSnackbar('Must be logged in to load a game.', 'error');
      return;
    }
    try {
      await loadGame(user.uid, snapshotId);
      showSnackbar('Game loaded successfully! Navigating to game...', 'success');
      navigate('/game');
    } catch (e) {
      showSnackbar(
        `Failed to load game: ${e instanceof Error ? e.message : 'Unknown error'}`,
        'error'
      );
    }
  };

  const handleDeleteGame = async (snapshotId: string) => {
    if (!user?.uid) return;
    try {
      await gameRepository.deleteGameSnapshot(user.uid, snapshotId);
      fetchSavedGames(user.uid);
      showSnackbar('Game deleted successfully!', 'success');
    } catch (e) {
      showSnackbar(
        `Failed to delete game: ${e instanceof Error ? e.message : 'Unknown error'}`,
        'error'
      );
    }
  };

  if (loadingSavedGames || gameLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
        <Typography variant="h6" ml={2}>
          Loading Games...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', p: 2 }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h5" component="h1">
          Game Library (Saved Games)
        </Typography>
      </Box>

      {savedGamesError && (
        <Alert
          severity="error"
          sx={{
            m: 2,
            backgroundColor: (theme) => theme.palette.background.paper,
            color: (theme) => theme.palette.text.primary,
          }}
        >
          Error: {savedGamesError}
        </Alert>
      )}

      <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
        <Button
          variant="contained"
          color="primary"
          sx={{ mt: 2 }}
          onClick={() => navigate('/cards')}
        >
          Start New Game (Select Prompt Card)
        </Button>
      </Box>

      <Paper
        elevation={1}
        sx={{
          flexGrow: 1,
          m: 2,
          overflowY: 'auto',
          backgroundColor: (theme) => theme.palette.background.paper,
        }}
      >
        {savedGames.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center', mt: 4 }}>
            <Typography variant="body1" color="text.secondary">
              No saved games found. Start a new one!
            </Typography>
          </Box>
        ) : (
          <List>
            {savedGames.map((game) => (
              <React.Fragment key={game.id}>
                <ListItem
                  secondaryAction={
                    <Box>
                      <IconButton edge="end" aria-label="load-game" onClick={() => handleLoadGame(game.id)}>
                        <PlayArrowIcon sx={{ color: (theme) => theme.palette.primary.main }} />
                      </IconButton>
                      <IconButton edge="end" aria-label="delete-game" onClick={() => handleDeleteGame(game.id)}>
                        <DeleteIcon sx={{ color: (theme) => theme.palette.error.main }} />
                      </IconButton>
                    </Box>
                  }
                >
                  <ListItemText
                    primary={game.title}
                    secondary={`Turn: ${game.currentTurn} | Last Saved: ${formatIsoDateForDisplay(game.updatedAt)}`}
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

export default GameLibraryScreen;
