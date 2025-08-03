// src/App.tsx

import React, { useState, useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useNavigate,
} from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  CssBaseline,
  ThemeProvider,
  createTheme,
  Box,
  Toolbar,
  AppBar,
  IconButton,
  Typography,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import LoginScreen from './ui/screens/LoginScreen';
import GameScreen from './ui/screens/GameScreen';
import LogViewerScreen from './ui/screens/LogViewerScreen';
import PromptCardManager from './ui/screens/PromptCardManager';
import WorldStateScreen from './ui/screens/WorldStateScreen';
import GameLibraryScreen from './ui/screens/GameLibraryScreen';

// Icons for navigation
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import ArticleIcon from '@mui/icons-material/Article';
import StorageIcon from '@mui/icons-material/Storage';
import ViewListIcon from '@mui/icons-material/ViewList';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';

import { useAuthStore } from './state/useAuthStore';

// Basic Material UI Theme
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#90caf9', // Light blue
    },
    secondary: {
      main: '#f48fb1', // Pink
    },
    background: {
      default: '#121212',
      paper: '#1d1d1d',
    },
    text: {
      primary: '#e0e0e0',
      secondary: '#b0b0b0',
    },
  },
  typography: {
    fontFamily: 'Roboto, Arial, sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none', // Keep text as is, not uppercase
        },
      },
    },
  },
});

const drawerWidth = 240;

function AppContent() {
  const { user, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Redirect to login if not authenticated and not loading
  useEffect(() => {
    if (!isLoading && !user && window.location.pathname !== '/login') {
      navigate('/login');
    } else if (!isLoading && user && window.location.pathname === '/login') {
      navigate('/game'); // Redirect to a default screen after login
    }
  }, [user, isLoading, navigate]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const drawer = (
    <div>
      <Toolbar sx={{ backgroundColor: 'primary.dark' }}>
        <Typography variant="h6" color="inherit" noWrap>
          StoryForge
        </Typography>
      </Toolbar>
      <List>
        <ListItem disablePadding>
          <ListItemButton component={Link} to="/game" onClick={handleDrawerToggle}>
            <ListItemIcon><PlayCircleIcon /></ListItemIcon>
            <ListItemText primary="Game" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton component={Link} to="/prompt-cards" onClick={handleDrawerToggle}>
            <ListItemIcon><ArticleIcon /></ListItemIcon>
            <ListItemText primary="Prompt Cards" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton component={Link} to="/game-library" onClick={handleDrawerToggle}>
            <ListItemIcon><LibraryBooksIcon /></ListItemIcon>
            <ListItemText primary="Game Library" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton component={Link} to="/world-state" onClick={handleDrawerToggle}>
            <ListItemIcon><StorageIcon /></ListItemIcon>
            <ListItemText primary="World State" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton component={Link} to="/log-viewer" onClick={handleDrawerToggle}>
            <ListItemIcon><ViewListIcon /></ListItemIcon>
            <ListItemText primary="Log Viewer" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton component={Link} to="/login" onClick={handleDrawerToggle}>
            <ListItemIcon><AccountCircleIcon /></ListItemIcon>
            <ListItemText primary="Login/Auth" />
          </ListItemButton>
        </ListItem>
      </List>
    </div>
  );

  if (isLoading) {
    // Show a global loading indicator while checking auth status
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Typography variant="h6">Initializing App...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <CssBaseline />
      {user && ( // Only show app bar and drawer if logged in
        <AppBar
          position="fixed"
          sx={{
            width: { sm: `calc(100% - ${drawerWidth}px)` },
            ml: { sm: `${drawerWidth}px` },
            display: { sm: 'none' }, // Hide on larger screens, only for mobile
          }}
        >
          <Toolbar>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, display: { sm: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" noWrap component="div">
              StoryForge
            </Typography>
          </Toolbar>
        </AppBar>
      )}

      {user && ( // Only show persistent drawer if logged in
        <Box
          component="nav"
          sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
          aria-label="mailbox folders"
        >
          {/* Mobile Drawer */}
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
          {/* Desktop Drawer */}
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
        </Box>
      )}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 0, sm: 3 }, // Adjust padding for mobile and desktop
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          mt: { xs: user ? '56px' : '0', sm: '0' }, // AppBar height on mobile
          display: 'flex',
          flexDirection: 'column',
          height: user ? 'calc(100vh - 56px)' : '100vh', // Adjust height if AppBar is present
        }}
      >
        <Routes>
          <Route path="/login" element={<LoginScreen />} />
          {user ? ( // Protected Routes
            <>
              <Route path="/game" element={<GameScreen onNavToggle={handleDrawerToggle} />} />
              <Route path="/prompt-cards" element={<PromptCardManager onNavToggle={handleDrawerToggle} />} />
              <Route path="/game-library" element={<GameLibraryScreen onNavToggle={handleDrawerToggle} />} />
              <Route path="/world-state" element={<WorldStateScreen onNavToggle={handleDrawerToggle} />} />
              <Route path="/log-viewer" element={<LogViewerScreen onNavToggle={handleDrawerToggle} />} />
              <Route path="/" element={<GameScreen onNavToggle={handleDrawerToggle} />} /> {/* Default logged-in route */}
            </>
          ) : (
            <Route path="*" element={<LoginScreen />} /> // Redirect any other path to login if not logged in
          )}
        </Routes>
      </Box>
    </Box>
  );
}

const App: React.FC = () => {
  return (
    <ThemeProvider theme={darkTheme}>
      <Router>
        <AppContent />
      </Router>
    </ThemeProvider>
  );
};

export default App;