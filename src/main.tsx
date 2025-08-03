// src/main.tsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Import all necessary dependencies for GameSession
import { GameSession } from './logic/gameSession';
import { promptCardManager } from './logic/cardManager';
import { promptBuilder } from './logic/promptBuilder';
import { aiClient } from './logic/aiClient'; // The real AI client
import { logManager } from './logic/logManager';
import { gameRepository } from './data/repositories/gameRepository';
import { promptCardRepository } from './data/repositories/promptCardRepository';

// Instantiate GameSession with its dependencies
const gameSessionInstance = new GameSession(
  promptCardRepository,
  gameRepository,
  promptBuilder,
  aiClient, // Pass the real aiClient instance
  logManager
);

// Make the gameSession instance globally accessible.
// This is done to avoid passing it down deeply through props or setting up complex React Context
// for a single global service in an MVP.
declare global {
  interface Window {
    gameSessionInstance: GameSession;
  }
}
window.gameSessionInstance = gameSessionInstance;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);