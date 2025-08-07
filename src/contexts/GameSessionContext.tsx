// src/contexts/GameSessionContext.tsx

import React, { createContext, useContext } from 'react';
import type { IGameSession } from '../logic/gameSession';

// Define the context to hold the IGameSession instance
const GameSessionContext = createContext<IGameSession | undefined>(undefined);

// Provider component to wrap the application and provide the gameSession
export const GameSessionProvider: React.FC<{ children: React.ReactNode; gameSession: IGameSession }> = ({ children, gameSession }) => {
  return (
    <GameSessionContext.Provider value={gameSession}>
      {children}
    </GameSessionContext.Provider>
  );
};

// Custom hook to easily consume the gameSession from the context by React components
export const useGameSession = () => {
  const context = useContext(GameSessionContext);
  if (context === undefined) {
    throw new Error('useGameSession must be used within a GameSessionProvider');
  }
  return context;
};