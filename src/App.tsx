// src/App.tsx
import React, { useEffect, useRef } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { useSettingsStore } from './state/useSettingsStore';
import { getAppTheme } from './theme';
import MainLayout from './ui/components/MainLayout';
import { AppRoutes } from './AppRoutes';
import { useAuthStore } from './state/useAuthStore';
import { useGameStateStore } from './state/useGameStateStore';
import { usePromptCardStore } from './state/usePromptCardStore';
import { useLogStore } from './state/useLogStore';

const App: React.FC = () => {
  const { themeMode } = useSettingsStore();
  const theme = React.useMemo(() => getAppTheme(themeMode), [themeMode]);

  const { user } = useAuthStore();
  const wasUserLoggedIn = useRef(!!user);

  useEffect(() => {
    const isLoggingOut = wasUserLoggedIn.current && !user;

    if (isLoggingOut) {
      console.log("User is logging out. Resetting all data stores.");
      useGameStateStore.getState().reset();
      usePromptCardStore.getState().reset();
      useSettingsStore.getState().reset();
      useLogStore.getState().reset();
    }
    
    // Update the ref for the next render
    wasUserLoggedIn.current = !!user;
  }, [user]);

  return (
    <ThemeProvider theme={theme}>
      <Router>
        <MainLayout>
          <AppRoutes />
        </MainLayout>
      </Router>
    </ThemeProvider>
  );
};

export default App;