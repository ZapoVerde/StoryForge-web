// src/App.tsx
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { useSettingsStore } from './state/useSettingsStore';
import { getAppTheme } from './theme';
import MainLayout from './ui/components/MainLayout';
import { AppRoutes } from './AppRoutes';

const App: React.FC = () => {
  const { themeMode } = useSettingsStore();
  const theme = React.useMemo(() => getAppTheme(themeMode), [themeMode]);

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