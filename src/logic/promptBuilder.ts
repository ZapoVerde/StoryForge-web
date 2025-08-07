// src/logic/promptBuilder.ts
import type { PromptCard, GameState, LogEntry, Message } from '../models';

import type { IContextStackAssembler } from './IContextStackAssembler';
import { ContextStackAssembler } from './ContextStackAssembler';
import { debugLog } from '../utils/debug';

export interface IPromptBuilder {
  buildFirstTurnPrompt(card: PromptCard): Message[]; // Deprecated but retained
  buildEveryTurnPrompt(
    card: PromptCard,
    currentGameState: GameState,
    logEntries: LogEntry[],
    conversationHistory: Message[],
    currentUserAction: string,
    isFirstPlayerAction: boolean
  ): Message[];
}

export class PromptBuilder implements IPromptBuilder {
  private stackAssembler: IContextStackAssembler;

  constructor() {
    this.stackAssembler = new ContextStackAssembler();
  }

  private buildCommonPromptParts(card: PromptCard): Message[] {
    const messages: Message[] = [];
    messages.push({ role: "system", content: `## Core Scenario / Persona\n${card.prompt}` });
    if (card.gameRules) messages.push({ role: "system", content: `\n## Game Rules\n${card.gameRules}` });
    if (card.emitSkeleton) messages.push({ role: "system", content: `\n## AI Output Structure Rules\n${card.emitSkeleton}` });
    if (card.functionDefs) messages.push({ role: "system", content: `\n## Available Functions (JSON)\n\`\`\`json\n${card.functionDefs}\n\`\`\`` });
    return messages;
  }

  public buildFirstTurnPrompt(card: PromptCard): Message[] {
    // Deprecated but preserved for compatibility
    const messages = this.buildCommonPromptParts(card);
    if (card.worldStateInit) messages.push({ role: "system", content: `\n## Initial World State (JSON)\n\`\`\`json\n${card.worldStateInit}\n\`\`\`` });
    if (card.firstTurnOnlyBlock) messages.push({ role: "system", content: `\n## First Turn Specifics\n${card.firstTurnOnlyBlock}` });
    return messages;
  }

  public buildEveryTurnPrompt(
    card: PromptCard,
    currentGameState: GameState,
    logEntries: LogEntry[],
    conversationHistory: Message[],
    currentUserAction: string,
    isFirstPlayerAction: boolean
  ): Message[] {
    const messages = this.buildCommonPromptParts(card);

    if (isFirstPlayerAction) {
      // Initial player action after game setup
      if (card.worldStateInit) {
        messages.push({ role: "system", content: `\n## Initial World State (JSON)\n\`\`\`json\n${card.worldStateInit}\n\`\`\`` });
      }
      if (card.firstTurnOnlyBlock) {
        messages.push({ role: "system", content: `\n## Initial Scene & Player Objective\n${card.firstTurnOnlyBlock}` });
      }
    } else {
      // Subsequent turns
      const dynamicContextMessages = this.stackAssembler.assembleContext(
        card,
        currentGameState,
        logEntries
      );
      messages.push(...dynamicContextMessages);
      messages.push(...conversationHistory);
    }

    messages.push({ role: "user", content: currentUserAction });

    debugLog("[PromptBuilder] Final messages sent to AI:", messages);

    return messages;
  }
}

export const promptBuilder = new PromptBuilder();
