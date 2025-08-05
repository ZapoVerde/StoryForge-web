// src/components/AuthOrchestrator.tsx
import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../state/useAuthStore';
import { useGameStateStore } from '../../state/useGameStateStore';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';

const AuthOrchestrator: React.FC = () => {
  const { user } = useAuthStore();
  const { loadLastActiveGame, gameLoading } = useGameStateStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [initialLoadChecked, setInitialLoadChecked] = useState(false);

  useEffect(() => {
    if (!user || initialLoadChecked) {
      return;
    }

    console.log("AuthOrchestrator: User authenticated, loading last active game...");
    loadLastActiveGame(user.uid).then((gameLoaded) => {
      setInitialLoadChecked(true);
      // Redirect only if the user is at the root path after login.
      // This avoids overriding intentional navigation to other pages like /cards or /settings.
      if (location.pathname === '/') {
        if (gameLoaded) {
          navigate('/game', { replace: true });
        } else {
          navigate('/library', { replace: true });
        }
      }
    });
  }, [user, initialLoadChecked, loadLastActiveGame, navigate, location.pathname]);

  if (!initialLoadChecked || gameLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
        <Typography variant="h6" ml={2}>Loading Session...</Typography>
      </Box>
    );
  }

  // Once the orchestration is complete, render the designated child route.
  return <Outlet />;
};

export default AuthOrchestrator;