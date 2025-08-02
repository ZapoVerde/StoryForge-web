// src/logic/promptBuilder.ts

import { PromptCard } from '../models/PromptCard';
// We will import LogEntry and GameSnapshot here when they are defined
// import { LogEntry } from '../models/LogEntry';
// import { GameSnapshot } from '../models/GameSnapshot';

/**
 * Interface defining the contract for the Prompt Builder.
 */
export interface IPromptBuilder {
  /**
   * Builds the complete prompt string for the first turn of a game.
   * This includes the main prompt, first-turn-only block, game rules, and emit skeleton.
   * @param card The PromptCard guiding the game.
   * @returns The full prompt string for the AI.
   */
  buildFirstTurnPrompt(card: PromptCard): string;

  /**
   * Builds the complete prompt string for subsequent turns.
   * This will eventually include dynamic context from game logs and world state based on stack instructions.
   * For MVP, this combines basic card fields and has a placeholder for dynamic context.
   * @param card The PromptCard guiding the game.
   * @param currentGameState The current state of the game (once GameSnapshot is defined).
   * @param logEntries The history of game logs (once LogEntry is defined).
   * @returns The full prompt string for the AI.
   */
  buildEveryTurnPrompt(
    card: PromptCard,
    // Placeholder types until LogEntry and GameSnapshot are defined
    currentGameState: any, // Placeholder for GameSnapshot
    logEntries: any[]      // Placeholder for LogEntry[]
  ): string;
}

/**
 * Concrete implementation of IPromptBuilder.
 */
export class PromptBuilder implements IPromptBuilder {

  /**
   * Helper to construct the common parts of the prompt.
   * This includes the main prompt, game rules, and emit skeleton.
   * Dynamic context (from stack instructions, logs, world state) will be added to this.
   */
  private buildBasePrompt(card: PromptCard): string {
    let promptParts: string[] = [];

    // Main Prompt (most important)
    promptParts.push(`## Core Scenario / Persona\n${card.prompt}`);

    // Game Rules
    if (card.gameRules) {
      promptParts.push(`\n## Game Rules\n${card.gameRules}`);
    }

    // World State Initialization (if present)
    if (card.worldStateInit) {
      promptParts.push(`\n## Initial World State (JSON)\n\`\`\`json\n${card.worldStateInit}\n\`\`\``);
    }

    // Emit Skeleton (structure for AI output)
    if (card.emitSkeleton) {
      promptParts.push(`\n## AI Output Structure Rules\n${card.emitSkeleton}`);
    }

    // Function Definitions (if present)
    if (card.functionDefs) {
      promptParts.push(`\n## Available Functions (JSON)\n\`\`\`json\n${card.functionDefs}\n\`\`\``);
    }

    // AI Settings (guidance for model behavior)
    // Note: AI settings are usually applied via API parameters, but providing them
    // in prompt can reinforce desired behavior for some models or for logging.
    promptParts.push(`\n## AI Configuration Guidance\nTemperature: ${card.aiSettings.temperature}\nMax Tokens: ${card.aiSettings.maxTokens}`);
    // Add other AI settings as needed for descriptive purposes in the prompt

    return promptParts.join('\n\n'); // Join with double newline for separation
  }

  buildFirstTurnPrompt(card: PromptCard): string {
    const basePrompt = this.buildBasePrompt(card);
    let firstTurnSpecifics = ``;

    if (card.firstTurnOnlyBlock) {
      firstTurnSpecifics = `\n## First Turn Specifics\n${card.firstTurnOnlyBlock}`;
    }

    return `${basePrompt}${firstTurnSpecifics}\n\n`; // Add extra newlines for separation
  }

  buildEveryTurnPrompt(
    card: PromptCard,
    currentGameState: any, // Placeholder for GameSnapshot
    logEntries: any[]      // Placeholder for LogEntry[]
  ): string {
    const basePrompt = this.buildBasePrompt(card);
    let dynamicContext = ``;

    // --- PLACEHOLDER FOR DYNAMIC CONTEXT BUILDING ---
    // This is where the core logic for parsing `StackInstructions` will go.
    // It will involve iterating through `logEntries`, filtering based on `currentGameState`,
    // and assembling relevant narrative, digest, and world state snippets.
    //
    // Example (conceptual):
    // const formattedDigest = this.formatDigest(logEntries, card.stackInstructions.digestEmission);
    // const formattedExpressionLog = this.formatExpressionLog(logEntries, card.stackInstructions.expressionLogPolicy);
    // const formattedWorldState = this.formatWorldState(currentGameState, card.stackInstructions.worldStatePolicy);
    // dynamicContext = `\n## Game Context\n${formattedDigest}\n${formattedExpressionLog}\n${formattedWorldState}`;
    // --------------------------------------------------
    if (card.stackInstructions) {
        dynamicContext = `\n## Game Context (Dynamic Context Pending Implementation)\n` +
                         `Stack Instructions indicate context is needed. ` +
                         `This section will eventually contain dynamically built context based on ` +
                         `game state and log entries per the stackInstructions policies. ` +
                         `e.g., Digest policy: ${card.stackInstructions.digestPolicy.filtering}, ` +
                         `Narrator prose mode: ${card.stackInstructions.narratorProseEmission.mode}.`;
    }


    return `${basePrompt}${dynamicContext}\n\n`; // Add extra newlines for separation
  }
}

// Export a singleton instance of the prompt builder
export const promptBuilder = new PromptBuilder();