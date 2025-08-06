// src/logic/gameSessionServices.ts
import { GameStateManager } from './GameStateManager.ts';
import { SnapshotUpdater } from './SnapshotUpdater.ts'; // CORRECTED
import { TurnProcessor } from './TurnProcessor.ts';
import { aiClient } from './aiClient.ts';
import { logManager } from './logManager.ts';
import { promptBuilder } from './promptBuilder.ts';

// Instantiate all the core logic services here to be used by GameSession
const gameStateManager = new GameStateManager();
export const snapshotUpdater = new SnapshotUpdater(gameStateManager);
export const turnProcessor = new TurnProcessor(aiClient, promptBuilder, logManager);