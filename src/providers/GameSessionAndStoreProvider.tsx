import React, { useRef } from 'react';
import { GameSession } from '../logic/gameSession';
import type { IGameSession } from '../logic/gameSession';
import { initializeGameStateStore } from '../state/useGameStateStore';
import { GameSessionProvider } from '../contexts/GameSessionContext';
// Centralized stateless services
import { turnProcessor, snapshotUpdater } from '../logic/gameSessionServices';

interface GameSessionAndStoreProviderProps {
  children: React.ReactNode;
}

export const GameSessionAndStoreProvider: React.FC<GameSessionAndStoreProviderProps> = ({ children }) => {
  const gameSessionServiceRef = useRef<IGameSession | null>(null);

  if (!gameSessionServiceRef.current) {
    console.log(
      '%c[GameSessionAndStoreProvider.tsx] Instantiating STATELESS GameSession service and initializing GameStateStore.',
      'color: blue; font-weight: bold;'
    );

    gameSessionServiceRef.current = new GameSession(turnProcessor, snapshotUpdater);
    initializeGameStateStore(gameSessionServiceRef.current);
  } else {
    console.log('[GameSessionAndStoreProvider.tsx] Re-rendering; GameSession service already instantiated.');
  }

  return (
    <GameSessionProvider gameSession={gameSessionServiceRef.current}>
      {children}
    </GameSessionProvider>
  );
};
