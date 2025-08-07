// src/ui/components/AuthOrchestrator.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../../state/useAuthStore';
import { useGameStateStore } from '../../state/useGameStateStore';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';

const AuthOrchestrator: React.FC = () => {
  console.log('%c[AuthOrchestrator.tsx] Component rendering.', 'color: green;');

  const { user } = useAuthStore();
  const gameLoading = useGameStateStore(state => state.gameLoading); 
  const navigate = useNavigate();
  const location = useLocation();
  const initialLoadAttempted = useRef(false);

  // Capture current action references for debugging useEffect dependencies
  const loadLastActiveGameAction = useGameStateStore(state => state.loadLastActiveGame);
  const userRef = useRef(user);
  const gameLoadingRef = useRef(gameLoading);
  const locationPathnameRef = useRef(location.pathname);


  useEffect(() => {
    // DEBUG: Log dependency changes
    console.log('%c[AuthOrchestrator.tsx] useEffect triggered.', 'color: blue;');
    if (userRef.current !== user) console.log(`[AuthOrchestrator.tsx] useEffect dependency change: user from ${userRef.current?.uid || 'null'} to ${user?.uid || 'null'}`);
    if (gameLoadingRef.current !== gameLoading) console.log(`[AuthOrchestrator.tsx] useEffect dependency change: gameLoading from ${gameLoadingRef.current} to ${gameLoading}`);
    if (locationPathnameRef.current !== location.pathname) console.log(`[AuthOrchestrator.tsx] useEffect dependency change: location.pathname from ${locationPathnameRef.current} to ${location.pathname}`);
    
    // Update refs for next comparison
    userRef.current = user;
    gameLoadingRef.current = gameLoading;
    locationPathnameRef.current = location.pathname;


    // Logic to prevent re-attempts for game loading
    if (user && !initialLoadAttempted.current) {
      initialLoadAttempted.current = true; // Mark that we are attempting this load
      
      console.log(`%c[AuthOrchestrator.tsx] Authenticated user (${user.uid}), attempting initial game load.`, 'color: orange; font-weight: bold;');

      loadLastActiveGameAction(user.uid).then((gameLoaded) => {
        console.log(`%c[AuthOrchestrator.tsx] loadLastActiveGameAction resolved. Game loaded: ${gameLoaded}. Current path: ${location.pathname}`, 'color: orange;');
        if (location.pathname === '/') {
          if (gameLoaded) {
            console.log('[AuthOrchestrator.tsx] Navigating to /game');
            navigate('/game', { replace: true });
          } else {
            console.log('[AuthOrchestrator.tsx] Navigating to /library (no game loaded)');
            navigate('/library', { replace: true });
          }
        } else {
             console.log(`[AuthOrchestrator.tsx] Not navigating from non-root path: ${location.pathname}`);
        }
      }).catch((error) => {
          console.error("[AuthOrchestrator.tsx] Error during loadLastActiveGameAction:", error);
          if (location.pathname === '/') {
              navigate('/library', { replace: true });
          }
      });
    } else if (!user && initialLoadAttempted.current) {
        // If user logs out and we had previously attempted to load, reset the flag.
        console.log('[AuthOrchestrator.tsx] User logged out, resetting initialLoadAttempted flag.');
        initialLoadAttempted.current = false;
    } else {
        console.log('[AuthOrchestrator.tsx] useEffect: No user or initialLoadAttempted already true. Skipping load logic.');
    }
  }, [user, gameLoading, location.pathname, navigate, loadLastActiveGameAction]); // loadLastActiveGameAction is now a stable reference due to Zustand's action pattern.

  if ((user && !initialLoadAttempted.current) || gameLoading) {
    console.log(`[AuthOrchestrator.tsx] Displaying loading screen. User: ${user ? 'present' : 'null'}, InitialLoadAttempted: ${initialLoadAttempted.current}, GameLoading: ${gameLoading}`);
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
        <Typography variant="h6" ml={2}>Loading Session...</Typography>
      </Box>
    );
  }

  console.log('[AuthOrchestrator.tsx] Rendering Outlet (loading complete).');
  return <Outlet />;
};

export default AuthOrchestrator;