// src/AppRoutes.tsx
import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ui/components/ProtectedRoute';
import AuthOrchestrator from './ui/components/AuthOrchestrator';
import LoginScreen from './ui/screens/LoginScreen';
import GameLibraryScreen from './ui/screens/GameLibraryScreen';
import PromptCardManager from './ui/screens/PromptCardManager';
import { GameScreen } from './ui/screens/GameScreen';
import WorldStateScreen from './ui/screens/WorldStateScreen';
import { LogViewerScreen } from './ui/screens/LogViewerScreen';
import SettingsScreen from './ui/screens/SettingsScreen';
import type { JSX } from 'react';

// Lazy-loaded screens
const SourceDumpScreen = lazy(() => import('./ui/screens/SourceDumpScreen'));

// Used by GameActiveRoute
import { useGameStateStore } from './state/useGameStateStore';

// Guard for routes that need an active game.
const GameActiveRoute: React.FC<{ children: JSX.Element }> = ({ children }) => {
  const { currentSnapshot } = useGameStateStore();
  if (!currentSnapshot) {
    return <Navigate to="/library" replace />;
  }
  return children;
};

export const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginScreen />} />
      <Route
        path="/sourcedump"
        element={
          <Suspense fallback={<div style={{ padding: 8 }}>Loading source dump…</div>}>
            <SourceDumpScreen />
          </Suspense>
        }
      />

      {/* Auth-gated layout */}
      <Route
        element={
          <ProtectedRoute>
            <AuthOrchestrator />
          </ProtectedRoute>
        }
      >
        {/* Renders inside AuthOrchestrator's <Outlet /> */}
        <Route path="/library" element={<GameLibraryScreen />} />
        <Route path="/cards" element={<PromptCardManager />} />
        <Route path="/settings" element={<SettingsScreen />} />

        {/* Active-game routes */}
        <Route
          path="/game"
          element={
            <GameActiveRoute>
              <GameScreen />
            </GameActiveRoute>
          }
        />
        <Route
          path="/world-state"
          element={
            <GameActiveRoute>
              <WorldStateScreen />
            </GameActiveRoute>
          }
        />
        <Route
          path="/logs"
          element={
            <GameActiveRoute>
              <LogViewerScreen />
            </GameActiveRoute>
          }
        />

        {/* Default authenticated route */}
        <Route path="/" element={<Navigate to="/library" replace />} />
      </Route>

      {/* Catch-all to login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};
