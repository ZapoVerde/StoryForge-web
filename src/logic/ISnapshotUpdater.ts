// src/logic/ISnapshotUpdater.ts
import type { GameSnapshot, ParsedNarrationOutput, LogEntry } from '../models';

export interface ITurnResult {
  parsedOutput: ParsedNarrationOutput;
  logEntry: LogEntry;
  playerAction?: string; // Include the player's action for conversation history
}

export interface ISnapshotUpdater {
  /**
   * Applies the result of a processed turn to a game snapshot.
   * This handles updating game state from deltas, scene changes, adding logs,
   * updating conversation history, and incrementing the turn counter.
   * @param snapshot The current GameSnapshot.
   * @param turnResult The result from the TurnProcessor.
   * @returns A new, updated GameSnapshot.
   */
  applyTurnResultToSnapshot(snapshot: GameSnapshot, turnResult: ITurnResult): GameSnapshot;

  /**
   * Applies a direct world state category rename to the snapshot.
   * @returns A new, updated GameSnapshot.
   */
  applyCategoryRename(snapshot: GameSnapshot, oldName: string, newName: string): GameSnapshot;

  /**
   * Applies a direct world state entity rename to the snapshot.
   * @returns A new, updated GameSnapshot.
   */
  applyEntityRename(snapshot: GameSnapshot, category: string, oldName: string, newName: string): GameSnapshot;
  applyCategoryDelete(snapshot: GameSnapshot, category: string): GameSnapshot;
  applyEntityDelete(snapshot: GameSnapshot, category: string, entity: string): GameSnapshot;
  applyKeyValueEdit(snapshot: GameSnapshot, key: string, value: any): GameSnapshot;
  applyKeyDelete(snapshot: GameSnapshot, key: string): GameSnapshot;
  applyPinToggle(snapshot: GameSnapshot, keyPath: string, type: 'variable' | 'entity' | 'category'): GameSnapshot;
}