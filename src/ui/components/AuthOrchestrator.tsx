// src/ui/components/AuthOrchestrator.tsx
import React, { useEffect, useReducer } from 'react';
import { useAuthStore } from '../../state/useAuthStore';
import { useGameStateStore } from '../../state/useGameStateStore';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { debugLog } from '../../utils/debug';

// --- Start of State Machine Definition ---

type LoadingState = 'IDLE' | 'CHECKING_AUTH' | 'LOADING_GAME' | 'READY';
type LoadingAction =
  | { type: 'AUTH_CHECK_COMPLETE'; payload: { isAuthenticated: boolean } }
  | { type: 'GAME_LOAD_SUCCESS' }
  | { type: 'GAME_LOAD_FAIL' }
  | { type: 'RESET' };

const reducer = (state: LoadingState, action: LoadingAction): LoadingState => {
  debugLog(`%c[AuthOrchestrator] State Transition: ${state} -> Action: ${action.type}`, 'color: blue;');
  switch (state) {
    case 'IDLE':
      if (action.type === 'AUTH_CHECK_COMPLETE') {
        return action.payload.isAuthenticated ? 'LOADING_GAME' : 'READY';
      }
      return state;
    case 'LOADING_GAME':
      if (action.type === 'GAME_LOAD_SUCCESS' || action.type === 'GAME_LOAD_FAIL') {
        return 'READY';
      }
      if (action.type === 'RESET') {
        return 'IDLE';
      }
      return state;
    case 'READY':
      if (action.type === 'RESET') {
        return 'IDLE';
      }
      return state;
    default:
      return state;
  }
};
// --- End of State Machine Definition ---


const AuthOrchestrator: React.FC = () => {
  const { user, isLoading: isAuthLoading } = useAuthStore();
  const loadLastActiveGame = useGameStateStore(state => state.loadLastActiveGame);
  const navigate = useNavigate();
  const location = useLocation();

  const [state, dispatch] = useReducer(reducer, 'IDLE');

  // Effect 1: React to authentication changes to kick off the state machine.
  useEffect(() => {
    if (!isAuthLoading) {
      dispatch({ type: 'AUTH_CHECK_COMPLETE', payload: { isAuthenticated: !!user } });
    }
  }, [isAuthLoading, user]);

  // Effect 2: Perform side-effects based on the current state of the machine.
  useEffect(() => {
    if (state === 'LOADING_GAME' && user) {
      loadLastActiveGame(user.uid).then((gameLoaded) => {
        dispatch({ type: gameLoaded ? 'GAME_LOAD_SUCCESS' : 'GAME_LOAD_FAIL' });
        // Navigate only if we are at the root, otherwise stay put.
        if (location.pathname === '/') {
          navigate(gameLoaded ? '/game' : '/library', { replace: true });
        }
      }).catch(() => {
        dispatch({ type: 'GAME_LOAD_FAIL' });
        if (location.pathname === '/') {
          navigate('/library', { replace: true });
        }
      });
    }
  }, [state, user, loadLastActiveGame, navigate, location.pathname]);
  
  // Effect 3: Reset the machine if the user logs out.
  useEffect(() => {
    if (!user && state === 'READY') {
      dispatch({ type: 'RESET' });
    }
  }, [user, state]);


  // Render loading indicator until the machine is in the 'READY' state.
  if (state !== 'READY') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
        <Typography variant="h6" ml={2}>Loading Session...</Typography>
      </Box>
    );
  }

  // Once ready, render the nested routes.
  return <Outlet />;
};

export default AuthOrchestrator;