// src/logic/IContextStackAssembler.ts
import type { PromptCard, GameState, LogEntry, Message } from '../models';

/**
 * Defines the contract for a service that assembles the dynamic parts
 * of an AI prompt's context based on StackInstructions.
 */
export interface IContextStackAssembler {
  /**
   * Assembles the full dynamic context stack based on the rules in the prompt card.
   * @param card The active PromptCard containing the StackInstructions.
   * @param gameState The current GameState.
   * @param logEntries The history of log entries for the session.
   * @returns An array of Message objects representing the assembled context.
   */
  assembleContext(
    card: PromptCard,
    gameState: GameState,
    logEntries: LogEntry[]
  ): Message[];
}

