// src/providers/GameSessionAndStoreProvider.tsx
import React, { useRef } from 'react';
import { GameSession, IGameSession } from '../logic/gameSession';
import { gameRepository } from '../data/repositories/gameRepository';
import { promptCardRepository } from '../data/repositories/promptCardRepository';
import { initializeGameStateStore } from '../state/useGameStateStore';
import { GameSessionProvider } from '../contexts/GameSessionContext';

// Import the new centralized service singletons
import { turnProcessor, snapshotUpdater } from '../logic/gameSessionServices';

interface GameSessionAndStoreProviderProps {
  children: React.ReactNode;
}

export const GameSessionAndStoreProvider: React.FC<GameSessionAndStoreProviderProps> = ({ children }) => {
  const gameSessionInstanceRef = useRef<IGameSession | null>(null);

  if (!gameSessionInstanceRef.current) {
    console.log("GameSessionAndStoreProvider: Instantiating GameSession...");
    
    // The GameSession constructor is now much cleaner
    gameSessionInstanceRef.current = new GameSession(
      gameRepository,
      promptCardRepository,
      turnProcessor,
      snapshotUpdater
    );
    
    initializeGameStateStore(gameSessionInstanceRef.current);
  }

  return (
    <GameSessionProvider gameSession={gameSessionInstanceRef.current}>
      {children}
    </GameSessionProvider>
  );
};