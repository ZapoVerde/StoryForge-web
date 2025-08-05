// src/AppRoutes.tsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ui/components/ProtectedRoute';
import AuthOrchestrator from './ui/components/AuthOrchestrator';
import LoginScreen from './ui/screens/LoginScreen';
import GameLibraryScreen from './ui/screens/GameLibraryScreen';
import PromptCardManager from './ui/screens/PromptCardManager';
import GameScreen from './ui/screens/GameScreen';
import WorldStateScreen from './ui/screens/WorldStateScreen';
import LogViewerScreen from './ui/screens/LogViewerScreen';
import SettingsScreen from './ui/screens/SettingsScreen';
import SourceDump from './ui/screens/SourceDump';

// A simple wrapper to protect routes that need an active game.
const GameActiveRoute: React.FC<{ children: JSX.Element }> = ({ children }) => {
    const { currentSnapshot } = useGameStateStore();
    if (!currentSnapshot) {
        return <Navigate to="/library" replace />;
    }
    return children;
};

import { useGameStateStore } from './state/useGameStateStore';

export const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginScreen />} />
      <Route path="/sourcedump" element={<SourceDump />} />

      {/* Authenticated Routes Layout */}
      <Route
        element={
          <ProtectedRoute>
            <AuthOrchestrator />
          </ProtectedRoute>
        }
      >
        {/* These routes render inside AuthOrchestrator's <Outlet /> */}
        <Route path="/library" element={<GameLibraryScreen onNavToggle={() => {}} />} />
        <Route path="/cards" element={<PromptCardManager onNavToggle={() => {}} />} />
        <Route path="/settings" element={<SettingsScreen onNavToggle={() => {}} />} />

        {/* Routes that also require an active game */}
        <Route path="/game" element={<GameActiveRoute><GameScreen onNavToggle={() => {}} /></GameActiveRoute>} />
        <Route path="/world-state" element={<GameActiveRoute><WorldStateScreen onNavToggle={() => {}} /></GameActiveRoute>} />
        <Route path="/logs" element={<GameActiveRoute><LogViewerScreen onNavToggle={() => {}} /></GameActiveRoute>} />

        {/* Default authenticated route */}
        <Route path="/" element={<Navigate to="/library" replace />} />
      </Route>

      {/* Catch-all for any unhandled paths */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};