// src/logic/ITurnProcessor.ts

import type { PromptCard, GameState, LogEntry, Message, AiConnection, ParsedNarrationOutput, TokenSummary} from '../models';

/**
 * Defines the contract for processing individual game turns, including AI interaction.
 */
export interface ITurnProcessor {
  /**
   * Processes the first turn of a new game, generating the initial AI response and log.
   * @param userId The ID of the current user.
   * @param card The PromptCard used for the game.
   * @param initialGameState The initial game state.
   * @param useDummyNarrator Flag to use a dummy AI.
   * @param aiConnections User's configured AI connections.
   * @returns A Promise resolving with the parsed AI output, the generated log entry, and token usage.
   */
  processFirstTurnNarratorResponse(
    userId: string,
    card: PromptCard,
    initialGameState: GameState,
    useDummyNarrator: boolean,
    aiConnections: AiConnection[],
  ): Promise<{
    parsedOutput: ParsedNarrationOutput;
    logEntry: LogEntry;
    aiRawOutput: string;
    tokenUsage: TokenSummary | null;
  }>;

  /**
   * Processes a player's action, generating the AI response and updating conversation history/logs.
   * @param userId The ID of the current user.
   * @param card The PromptCard used for the game.
   * @param currentGameState The current game state before the turn.
   * @param logs The current game logs.
   * @param conversationHistory The current conversation history.
   * @param action The player's input string.
   * @param turnNumber The current turn number.
   * @param useDummyNarrator Flag to use a dummy AI.
   * @param aiConnections User's configured AI connections.
   * @returns A Promise resolving with the parsed AI output, the generated log entry, and token usage.
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
  ): Promise<{
    parsedOutput: ParsedNarrationOutput;
    logEntry: LogEntry;
    aiRawOutput: string;
    tokenUsage: TokenSummary | null;
  }>;
}