// src/logic/promptBuilder.ts
import type { PromptCard, GameState, LogEntry, Message } from '../models';

import type { IContextStackAssembler } from './IContextStackAssembler'; // <-- ADD THIS LINE
import { ContextStackAssembler } from './ContextStackAssembler';   // <-- AND THIS LINE
import { debugLog, errorLog } from '../utils/debug';
import { useSettingsStore } from '../state/useSettingsStore'; // if using hooks in React files


export interface IPromptBuilder {
  buildFirstTurnPrompt(card: PromptCard): Message[];
  buildEveryTurnPrompt(
    card: PromptCard,
    currentGameState: GameState,
    logEntries: LogEntry[],
    conversationHistory: Message[],
    currentUserAction: string,
  ): Message[];
}

export class PromptBuilder implements IPromptBuilder {
  private stackAssembler: IContextStackAssembler;

  constructor() {
    // The builder now owns an instance of the assembler
    this.stackAssembler = new ContextStackAssembler();
  }

  private buildCommonPromptParts(card: PromptCard): Message[] {
    const messages: Message[] = [];
    messages.push({ role: "system", content: `## Core Scenario / Persona\n${card.prompt}` });
    if (card.gameRules) {
      messages.push({ role: "system", content: `\n## Game Rules\n${card.gameRules}` });
    }
    if (card.emitSkeleton) {
      messages.push({ role: "system", content: `\n## AI Output Structure Rules\n${card.emitSkeleton}` });
    }
    if (card.functionDefs) {
      messages.push({ role: "system", content: `\n## Available Functions (JSON)\n\`\`\`json\n${card.functionDefs}\n\`\`\`` });
    }
    return messages;
  }

  public buildFirstTurnPrompt(card: PromptCard): Message[] {
    const messages = this.buildCommonPromptParts(card);

    if (card.worldStateInit) {
      messages.push({ role: "system", content: `\n## Initial World State (JSON)\n\`\`\`json\n${card.worldStateInit}\n\`\`\`` });
    }
    if (card.firstTurnOnlyBlock) {
      messages.push({ role: "system", content: `\n## First Turn Specifics\n${card.firstTurnOnlyBlock}` });
    }

    return messages;
  }

  public buildEveryTurnPrompt(
    card: PromptCard,
    currentGameState: GameState,
    logEntries: LogEntry[],
    conversationHistory: Message[],
    currentUserAction: string,
  ): Message[] {
    // 1. Get the static parts of the prompt
    const messages = this.buildCommonPromptParts(card);

    // 2. Delegate the complex part to the stack assembler
    const dynamicContextMessages = this.stackAssembler.assembleContext(
      card,
      currentGameState,
      logEntries
    );
    messages.push(...dynamicContextMessages);

    // 3. Append conversation history
    messages.push(...conversationHistory);

    // 4. Append the current user's action
    messages.push({ role: "user", content: currentUserAction });

    return messages;
  }
}

// Export a singleton instance for easy use across the app
export const promptBuilder = new PromptBuilder();