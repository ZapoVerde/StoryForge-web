// src/providers/GameSessionAndStoreProvider.tsx
import React, { useRef } from 'react';
import { GameSession } from '../logic/gameSession';
import type { IGameSession } from '../logic/gameSession';
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
    // DEBUG: Log the very first instantiation
    console.log('%c[GameSessionAndStoreProvider.tsx] Instantiating GameSession and Initializing GameStateStore for the first time.', 'color: blue; font-weight: bold;');

    
    // The GameSession constructor is now much cleaner
    gameSessionInstanceRef.current = new GameSession(
      gameRepository,
      promptCardRepository,
      turnProcessor,
      snapshotUpdater
    );

    // DEBUG: Confirm GameSession injection
    initializeGameStateStore(gameSessionInstanceRef.current);
  } else {
    // DEBUG: Log if it's NOT the first time (should happen once per app lifecycle)
    console.log('[GameSessionAndStoreProvider.tsx] Re-rendering, GameSession already instantiated.');
  }   
   
  return (
    <GameSessionProvider gameSession={gameSessionInstanceRef.current}>
      {children}
    </GameSessionProvider>
  );
};