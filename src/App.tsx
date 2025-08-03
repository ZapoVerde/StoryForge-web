// src/App.tsx

import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
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
  Divider
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import HistoryIcon from '@mui/icons-material/History';
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
import SourceDump from './ui/screens/SourceDump';


const drawerWidth = 240;

const AppContent: React.FC = () => {
  // ALL HOOKS MUST BE CALLED AT THE TOP LEVEL, UNCONDITIONALLY
  const { user, isLoading: authLoading, signOut } = useAuthStore();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Effect to handle navigation redirection based on auth state
  // This hook is now called unconditionally on every render.
React.useEffect(() => {
  const publicPaths = ['/login', '/source-dump'];

  if (!user && !publicPaths.includes(window.location.pathname)) {
    navigate('/login');
  } else if (user && window.location.pathname === '/login') {
    navigate('/library');
  }
}, [user, navigate]);
 // Dependencies: user and navigate

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  // Define navigation items
  const navItems = [
    { text: 'Game Library', icon: <LibraryBooksIcon />, path: '/library', requiresAuth: true },
    { text: 'Prompt Cards', icon: <DashboardIcon />, path: '/cards', requiresAuth: true },
    { text: 'Game Session', icon: <TravelExploreIcon />, path: '/game', requiresAuth: true },
    { text: 'World State', icon: <TravelExploreIcon />, path: '/world-state', requiresAuth: true },
    { text: 'Log Viewer', icon: <HistoryIcon />, path: '/logs', requiresAuth: true },
    { text: 'Settings', icon: <SettingsIcon />, path: '/settings', requiresAuth: true },
  ];

  // Now, the loading check happens AFTER all hooks are called.
  if (authLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
        <Typography variant="h6" ml={2}>Authenticating...</Typography>
      </Box>
    );
  }

  const drawer = (
    <Box onClick={handleDrawerToggle} sx={{ textAlign: 'center' }}>
      <Typography variant="h6" sx={{ my: 2 }}>
        StoryForge
      </Typography>
      <Divider />
      <List>
        {navItems.filter(item => user ? true : !item.requiresAuth).map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton onClick={() => navigate(item.path)}>
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
              <ListItemIcon><LogoutIcon /></ListItemIcon> {/* Using LogoutIcon for 'Login' also */}
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
        ModalProps={{
          keepMounted: true, // Better open performance on mobile.
        }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
        }}
      >
        {drawer}
      </Drawer>
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', sm: 'block' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
        }}
        open
      >
        {drawer}
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: 0, width: { sm: `calc(100% - ${drawerWidth}px)` }, height: '100%' }}>
        <Routes>
          <Route path="/source-dump" element={<SourceDump />} />
          <Route path="/login" element={<LoginScreen />} />
          {user ? (
            // Authenticated routes
            <>
              <Route path="/library" element={<GameLibraryScreen onNavToggle={handleDrawerToggle} />} />
              <Route path="/cards" element={<PromptCardManager onNavToggle={handleDrawerToggle} />} />
              <Route path="/game" element={<GameScreen onNavToggle={handleDrawerToggle} />} />
              <Route path="/world-state" element={<WorldStateScreen onNavToggle={handleDrawerToggle} />} />
              <Route path="/logs" element={<LogViewerScreen onNavToggle={handleDrawerToggle} />} />
              <Route path="/settings" element={<SettingsScreen onNavToggle={handleDrawerToggle} />} />
              <Route path="/" element={<GameLibraryScreen onNavToggle={handleDrawerToggle} />} /> {/* Default route */}
              <Route path="*" element={<GameLibraryScreen onNavToggle={handleDrawerToggle} />} /> {/* Catch-all for logged in */}
            </>
          ) : (
            // Unauthenticated routes redirect to login
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