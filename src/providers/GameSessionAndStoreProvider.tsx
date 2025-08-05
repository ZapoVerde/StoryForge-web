// src/providers/GameSessionAndStoreProvider.tsx

import React, { useRef } from 'react';
import { GameSession, IGameSession } from '../logic/gameSession';
import { promptCardManager } from '../logic/cardManager'; // Not directly used in GameSession constructor, but important for other logic
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
  const gameSessionInstanceRef = useRef<IGameSession | null>(null);

  if (!gameSessionInstanceRef.current) {
    console.log("GameSessionAndStoreProvider: Instantiating GameSession...");
    gameSessionInstanceRef.current = new GameSession(
      promptCardRepository,
      gameRepository,
      promptBuilder,
      aiClient, // Pass the real aiClient here
      logManager
    );
    initializeGameStateStore(gameSessionInstanceRef.current);
  }

  return (
    <GameSessionProvider gameSession={gameSessionInstanceRef.current}>
      {children}
    </GameSessionProvider>
  );
};