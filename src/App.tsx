// src/App.tsx

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import CodeIcon from '@mui/icons-material/Code';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  CssBaseline,
  Box,
  CircularProgress,
  Typography,
  Divider,
  IconButton
} from '@mui/material';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import StyleIcon from '@mui/icons-material/Style';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import HistoryIcon from '@mui/icons-material/History';
import DataObjectIcon from '@mui/icons-material/DataObject';
import LoginScreen from './ui/screens/LoginScreen';
import GameLibraryScreen from './ui/screens/GameLibraryScreen';
import PromptCardManager from './ui/screens/PromptCardManager';
import GameScreen from './ui/screens/GameScreen';
import WorldStateScreen from './ui/screens/WorldStateScreen';
import LogViewerScreen from './ui/screens/LogViewerScreen';
import SettingsScreen from './ui/screens/SettingsScreen';
import { useAuthStore } from './state/useAuthStore';
import { useTheme, ThemeProvider, createTheme } from '@mui/material/styles';
import { useSettingsStore } from './state/useSettingsStore';
import { useGameStateStore } from './state/useGameStateStore';
import SourceDump from './ui/screens/SourceDump';
import MenuIcon from '@mui/icons-material/Menu'; // NEW: Import MenuIcon


const drawerWidth = 240;
const AppContent: React.FC = () => {
  const { user, isLoading: authLoading, signOut } = useAuthStore();
  const { currentSnapshot, loadLastActiveGame, gameLoading } = useGameStateStore();
  const navigate = useNavigate();
  const location = useLocation(); // Get current location
  const [mobileOpen, setMobileOpen] = useState(false);
  const [initialLoadChecked, setInitialLoadChecked] = useState(false);

  useEffect(() => {
    const publicPaths = ['/login', '/sourcedump'];

    if (authLoading) return;

    if (!user) {
      if (!publicPaths.includes(location.pathname)) {
        navigate('/login');
      }
      return;
    }

    if (!initialLoadChecked) {
      console.log("AppContent: User logged in, attempting to load last active game...");
      loadLastActiveGame(user.uid).then((gameLoaded) => {
        setInitialLoadChecked(true);
        if (gameLoaded) {
          if (!['/game', '/world-state', '/logs', '/sourcedump'].includes(location.pathname)) {
            navigate('/game');
          }
        } else {
          // If no game was loaded and user is authenticated and not on a public path,
          // direct them to the game library to start a new game or select one.
          if (!publicPaths.includes(location.pathname)) {
            navigate('/library');
          }
        }
      });
    }
  }, [user, authLoading, navigate, initialLoadChecked, loadLastActiveGame, location.pathname]);


  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const navItems = [
    { text: 'Saved Games', icon: <LibraryBooksIcon />, path: '/library', requiresAuth: true },
    { text: 'Prompt Cards', icon: <StyleIcon />, path: '/cards', requiresAuth: true },
    { text: 'Current Game', icon: <TravelExploreIcon />, path: '/game', requiresAuth: true, disabled: !currentSnapshot },
    { text: 'World State', icon: <DataObjectIcon />, path: '/world-state', requiresAuth: true, disabled: !currentSnapshot },
    { text: 'Log Viewer', icon: <HistoryIcon />, path: '/logs', requiresAuth: true, disabled: !currentSnapshot },
    { text: 'Settings', icon: <SettingsIcon />, path: '/settings', requiresAuth: true },
    { text: 'Source Dump', icon: <CodeIcon />, path: '/sourcedump', requiresAuth: false, disabled: false },
  ];

  if (authLoading || (user && !initialLoadChecked)) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
        <Typography variant="h6" ml={2}>Authenticating & Loading Session...</Typography>
      </Box>
    );
  }

  const drawer = (
    <Box onClick={handleDrawerToggle} sx={{ textAlign: 'center' }}>
      <Typography variant="h6" sx={{ my: 2 }}>StoryForge</Typography>
      <Divider />
      <List>
        {navItems.filter(item => user ? true : !item.requiresAuth).map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton onClick={() => navigate(item.path)} disabled={item.disabled}>
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
        {user ? (
          <ListItem disablePadding>
            <ListItemButton onClick={handleSignOut}>
              <ListItemIcon><LogoutIcon /></ListItemIcon>
              <ListItemText primary="Logout" />
            </ListItemButton>
          </ListItem>
        ) : (
          <ListItem disablePadding>
            <ListItemButton onClick={() => navigate('/login')}>
              <ListItemIcon><LogoutIcon /></ListItemIcon>
              <ListItemText primary="Login" />
            </ListItemButton>
          </ListItem>
        )}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <CssBaseline />
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{ '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth }, }}
      >
        {drawer}
      </Drawer>

      {/* Main content area, now structured with its own AppBar */}
      <Box component="main" sx={{ flexGrow: 1, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <IconButton
          color="inherit"
          aria-label="open drawer"
          onClick={handleDrawerToggle}
          edge="start"
          sx={{
            position: 'fixed',
            top: 16,
            right: 16,
            zIndex: (theme) => theme.zIndex.drawer + 1,
            backgroundColor: (theme) => theme.palette.background.paper,
            boxShadow: 2,
            '&:hover': {
              backgroundColor: (theme) => theme.palette.action.hover,
            },
          }}
        >
          <MenuIcon />
        </IconButton>     
          <Routes>
            {/* IMPORTANT: Remove onNavToggle from individual route elements.
                The AppContent's global AppBar now handles navigation toggling.
                The screen components should adjust their headers accordingly. */}
            <Route path="/sourcedump" element={<SourceDump onNavToggle={handleDrawerToggle} />} />
            <Route path="/login" element={<LoginScreen onNavToggle={handleDrawerToggle} />} />

            {user ? (
              <>
                {/* No `onNavToggle` prop needed on these components anymore */}
                <Route path="/library" element={<GameLibraryScreen onNavToggle={handleDrawerToggle} />} />
                <Route path="/cards" element={<PromptCardManager onNavToggle={handleDrawerToggle} />} />

                {currentSnapshot ? (
                  <>
                      <Route path="/game" element={<GameScreen onNavToggle={handleDrawerToggle} />} />
                      <Route path="/world-state" element={<WorldStateScreen onNavToggle={handleDrawerToggle} />} />
                      <Route path="/logs" element={<LogViewerScreen onNavToggle={handleDrawerToggle} />} />
                  </>
                ) : (
                  null
                )}
                <Route path="/settings" element={<SettingsScreen onNavToggle={handleDrawerToggle} />} />
                <Route path="/" element={<GameLibraryScreen onNavToggle={handleDrawerToggle} />} />
                <Route path="*" element={<GameLibraryScreen onNavToggle={handleDrawerToggle} />} />
              </>
            ) : (
              <Route path="*" element={<LoginScreen />} />
            )}
          </Routes>
        </Box>
      </Box>
  );
};

const App: React.FC = () => {
  const { themeMode } = useSettingsStore(); // Get theme mode from settings store
  const theme = React.useMemo(
    () =>
      createTheme({
        palette: {
          mode: themeMode,
          primary: {
            main: '#6200EE', // A shade of purple
          },
          secondary: {
            main: '#03DAC6', // A shade of teal
          },
          background: {
            default: themeMode === 'light' ? '#f5f5f5' : '#121212',
            paper: themeMode === 'light' ? '#ffffff' : '#1e1e1e',
          },
        },
        typography: {
            h6: {
                fontWeight: 600,
            },
        },
        components: {
            MuiPaper: {
                styleOverrides: {
                    root: ({ theme }) => ({
                        backgroundColor: theme.palette.background.paper,
                        border: `1px solid ${theme.palette.divider}`,
                    }),
                },
            },
            MuiCard: {
                styleOverrides: {
                    root: ({ theme }) => ({
                        backgroundColor: theme.palette.background.paper,
                        border: `1px solid ${theme.palette.divider}`,
                    }),
                },
            },
            MuiDialog: {
                styleOverrides: {
                    paper: ({ theme }) => ({
                        backgroundColor: theme.palette.background.paper,
                        border: `1px solid ${theme.palette.divider}`,
                    }),
                },
            },
            MuiButton: {
                styleOverrides: {
                    root: ({ theme }) => ({
                        borderRadius: '8px',
                    }),
                },
            },
            MuiSwitch: {
                styleOverrides: {
                    switchBase: ({ theme }) => ({
                        color: theme.palette.grey[500],
                    }),
                    checked: ({ theme }) => ({
                        color: theme.palette.primary.main,
                        '& + .MuiSwitch-track': {
                            backgroundColor: theme.palette.primary.main,
                        },
                    }),
                },
            },
            MuiSlider: {
                styleOverrides: {
                    thumb: ({ theme }) => ({
                        color: theme.palette.primary.main,
                    }),
                    track: ({ theme }) => ({
                        color: theme.palette.primary.main,
                    }),
                    rail: ({ theme }) => ({
                        color: theme.palette.grey[400],
                    }),
                },
            },
            MuiListItemButton: {
                styleOverrides: {
                    root: ({ theme }) => ({
                        '&.Mui-selected': {
                            backgroundColor: theme.palette.action.selected,
                        },
                        '&.Mui-selected:hover': {
                            backgroundColor: theme.palette.action.hover,
                        },
                    }),
                },
            },
            MuiAlert: {
                styleOverrides: {
                    root: ({ theme }) => ({
                        borderRadius: '8px',
                        backgroundColor: theme.palette.background.paper,
                        border: `1px solid ${theme.palette.divider}`,
                    }),
                },
            },
            MuiSnackbarContent: {
                styleOverrides: {
                    root: ({ theme }) => ({
                        backgroundColor: theme.palette.background.paper,
                        color: theme.palette.text.primary,
                        border: `1px solid ${theme.palette.divider}`,
                    }),
                },
            },
        },
      }),
    [themeMode],
  );

  return (
    <ThemeProvider theme={theme}>
      <Router>
        <AppContent />
      </Router>
    </ThemeProvider>
  );
};

export default App;