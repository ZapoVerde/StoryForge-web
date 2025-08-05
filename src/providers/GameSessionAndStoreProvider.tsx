// src/providers/GameSessionAndStoreProvider.tsx

import React, { useRef } from 'react';
import { GameSession, IGameSession } from '../logic/gameSession';
import { promptCardManager } from '../logic/cardManager';
import { promptBuilder } from '../logic/promptBuilder';
import { aiClient } from '../logic/aiClient';
import { logManager } from '../logic/logManager';
import { gameRepository } from '../data/repositories/gameRepository';
import { promptCardRepository } from '../data/repositories/promptCardRepository';
import { initializeGameStateStore } from '../state/useGameStateStore';
import { GameSessionProvider } from '../contexts/GameSessionContext'; // Import the context provider

interface GameSessionAndStoreProviderProps {
  children: React.ReactNode;
}

export const GameSessionAndStoreProvider: React.FC<GameSessionAndStoreProviderProps> = ({ children }) => {
  // Use useRef to ensure gameSessionInstance is created only once across renders
  const gameSessionInstanceRef = useRef<IGameSession | null>(null);

  if (!gameSessionInstanceRef.current) {
    console.log("GameSessionAndStoreProvider: Instantiating GameSession...");
    gameSessionInstanceRef.current = new GameSession(
      promptCardRepository,
      gameRepository, // Passed as gameRepoInstance
      promptBuilder,
      aiClient,
      logManager
    );
    // Inject the gameSession instance into the Zustand store's internal state
    initializeGameStateStore(gameSessionInstanceRef.current);
  }

  // Provide the gameSession instance via React Context to any components that need it
  return (
    <GameSessionProvider gameSession={gameSessionInstanceRef.current}>
      {children}
    </GameSessionProvider>
  );
};