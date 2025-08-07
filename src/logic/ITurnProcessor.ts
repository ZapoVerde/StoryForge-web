// src/logic/ITurnProcessor.ts

import type {
  PromptCard,
  GameState,
  LogEntry,
  Message,
  AiConnection,
  ParsedNarrationOutput,
  TokenSummary
} from '../models';

/**
 * Defines the contract for processing individual game turns, including AI interaction.
 */
export interface ITurnProcessor {
  /**
   * Processes a player's action, generating the AI response and updating conversation history/logs.
   * Handles both the initial turn and subsequent turns.
   *
   * @param userId The ID of the current user.
   * @param card The PromptCard used for the game.
   * @param currentGameState The current game state before the turn.
   * @param logs The current game logs.
   * @param conversationHistory The current conversation history.
   * @param action The player's input string.
   * @param turnNumber The current turn number.
   * @param useDummyNarrator Flag to use a dummy AI.
   * @param aiConnections User's configured AI connections.
   * @param isFirstPlayerAction True if this is the first player input after game start.
   */
  processPlayerTurn(
    userId: string,
    card: PromptCard,
    currentGameState: GameState,
    logs: LogEntry[],
    conversationHistory: Message[],
    action: string,
    turnNumber: number,
    useDummyNarrator: boolean,
    aiConnections: AiConnection[],
    isFirstPlayerAction: boolean // <-- PATCHED
  ): Promise<{
    parsedOutput: ParsedNarrationOutput;
    logEntry: LogEntry;
    aiRawOutput: string;
    tokenUsage: TokenSummary | null;
  }>;
}
