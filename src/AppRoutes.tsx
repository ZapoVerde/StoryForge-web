// src/AppRoutes.tsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ui/components/ProtectedRoute';
import AuthOrchestrator from './ui/components/AuthOrchestrator';
import LoginScreen from './ui/screens/LoginScreen';
import GameLibraryScreen from './ui/screens/GameLibraryScreen';
import PromptCardManager from './ui/screens/PromptCardManager';
import {GameScreen} from './ui/screens/GameScreen'; 
import WorldStateScreen from './ui/screens/WorldStateScreen';
import { LogViewerScreen } from './ui/screens/LogViewerScreen';
import SettingsScreen from './ui/screens/SettingsScreen';
import SourceDump from './ui/screens/SourceDump';
import type { JSX } from 'react';

// FIX: Moved this import to the top of the file so it can be used by GameActiveRoute.
import { useGameStateStore } from './state/useGameStateStore';


// A simple wrapper to protect routes that need an active game.
const GameActiveRoute: React.FC<{ children: JSX.Element }> = ({ children }) => {
    const { currentSnapshot } = useGameStateStore();
    if (!currentSnapshot) {
        // If no game is active, redirect to the library.
        return <Navigate to="/library" replace />;
    }
    return children;
};

export const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginScreen />} />
      <Route path="/sourcedump" element={<SourceDump />} />

      {/* This layout component handles auth checks and orchestrates the initial game load */}
      <Route
        element={
          <ProtectedRoute>
            <AuthOrchestrator />
          </ProtectedRoute>
        }
      >
        {/* These routes render inside AuthOrchestrator's <Outlet /> */}
        <Route path="/library" element={<GameLibraryScreen />} />
        <Route path="/cards" element={<PromptCardManager />} />
        <Route path="/settings" element={<SettingsScreen />} />
        
        {/* These routes require an active game snapshot to be loaded */}
        <Route path="/game" element={<GameActiveRoute><GameScreen /></GameActiveRoute>} />
        <Route path="/world-state" element={<GameActiveRoute><WorldStateScreen /></GameActiveRoute>} />
        <Route path="/logs" element={<GameActiveRoute><LogViewerScreen /></GameActiveRoute>} />

        {/* Default authenticated route */}
        <Route path="/" element={<Navigate to="/library" replace />} />
      </Route>

      {/* Catch-all for any unhandled paths, redirecting to login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};