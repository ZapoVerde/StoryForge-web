// src/logic/promptBuilder.ts

import type { PromptCard, AiSettings } from '../models/PromptCard';
import type { GameState, SceneState } from '../models/GameState';
import type { LogEntry } from '../models/LogEntry';
import type { Message } from '../models/Message';
// Changed to regular import for runtime access to enum members
import { StackMode, FilterMode, StackInstructions, EmissionRule, ProsePolicy, DigestFilterPolicy } from '../models/StackInstructions';
import type { DeltaMap, DeltaInstruction } from '../models/DeltaInstruction';
import type { DigestLine } from '../models/LogEntryElements';
import type { ParsedNarrationOutput } from '../models/ParsedNarrationOutput';

// Marker constants for parsing AI output (from NarrationParser.kt)
const DELTA_MARKER = "@delta";
const DIGEST_MARKER = "@digest";
const SCENE_MARKER = "@scene";

/**
 * Interface defining the contract for the Prompt Builder.
 * This module is now responsible for both assembling the AI prompt AND parsing its structured output.
 * This simplifies dependencies for GameSession.
 */
export interface IPromptBuilder {
  /**
   * Builds the complete prompt string as an array of Messages for the first turn of a game.
   * This includes the main prompt, first-turn-only block, game rules, etc.
   * @param card The PromptCard guiding the game.
   * @returns An array of Message objects.
   */
  buildFirstTurnPrompt(card: PromptCard): Message[];

  /**
   * Builds the complete prompt string as an array of Messages for subsequent turns.
   * This includes dynamic context from game logs, world state, and conversation history.
   * Replicates `StackAssembler.assemble`.
   * @param card The PromptCard guiding the game.
   * @param currentGameState The current state of the game.
   * @param logEntries The history of game logs.
   * @param conversationHistory The full user/assistant conversation.
   * @param currentUserAction The current player's action for this turn.
   * @param turnNumber The current turn number.
   * @returns An array of Message objects.
   */
  buildEveryTurnPrompt(
    card: PromptCard,
    currentGameState: GameState,
    logEntries: LogEntry[],
    conversationHistory: Message[],
    currentUserAction: string,
    turnNumber: number
  ): Message[];

  /**
   * Parses the raw AI response string into a structured ParsedNarrationOutput object.
   * This function directly replicates the logic of `NarrationParser.extractJsonAndCleanNarration`.
   * Moved here for a simplified GameSession dependency (only talks to builder for prompt/parse).
   * @param rawAiOutput The full, raw string from the AI model.
   * @returns A ParsedNarrationOutput object.
   */
  parseNarratorOutput(rawAiOutput: string): ParsedNarrationOutput;
}

/**
 * Concrete implementation of IPromptBuilder.
 */
export class PromptBuilder implements IPromptBuilder {

  /**
   * Helper to extract tags using regex (from NarrationParser).
   */
  private extractTags(text: string): string[] {
    const tagPattern = /[#@$][a-zA-Z0-9_]+/g;
    const matches = text.match(tagPattern);
    return matches || [];
  }

  /**
   * Extracts a JSON object from a list of lines, handling potential parsing errors (from NarrationParser).
   */
  private extractJsonObject(lines: string[]): Record<string, any> {
    const text = lines.join('\n').trim();
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch (e) {
      console.error("Failed to parse JSON object:", e, "\nText:", text);
      return {};
    }
  }

  /**
   * Extracts a JSON array from a list of lines, handling potential parsing errors (from NarrationParser).
   */
  private extractJsonArray(lines: string[]): any[] {
    const text = lines.join('\n').trim();
    if (!text) return [];
    try {
      return JSON.parse(text);
    } catch (e) {
      console.error("Failed to parse JSON array:", e, "\nText:", text);
      return [];
    }
  }

  /**
   * Parses a single key-value pair from the AI's delta JSON into a DeltaInstruction (from DeltaInstruction companion object).
   */
  private parseSingleDelta(rawKey: string, value: any): DeltaInstruction | null {
    const op = rawKey.charAt(0);
    const path = rawKey.substring(1);

    switch (op) {
      case '+': return { op: 'add', key: path, value: value };
      case '=': return { op: 'assign', key: path, value: value };
      case '!': return { op: 'declare', key: path, value: value };
      case '-': return { op: 'delete', key: path };
      default:
        console.warn(`Invalid delta operation character '${op}' in key '${rawKey}'`);
        return null;
    }
  }

  // --- Public Parsing Method (from NarrationParser.kt) ---
  parseNarratorOutput(rawAiOutput: string): ParsedNarrationOutput {
    const lines = rawAiOutput.split('\n');

    const deltaIndex = lines.findIndex(line => line.trim() === DELTA_MARKER);
    const digestIndex = lines.findIndex(line => line.trim() === DIGEST_MARKER);
    const sceneIndex = lines.findIndex(line => line.trim() === SCENE_MARKER);

    // Determine prose end by the first marker found
    const proseEndIndex = [deltaIndex, digestIndex, sceneIndex]
      .filter(index => index !== -1)
      .reduce((min, current) => Math.min(min, current), lines.length);

    const prose = lines.slice(0, proseEndIndex).join('\n').trim();

    // Slice lines for each block
    const deltaLines = deltaIndex !== -1 ? lines.slice(deltaIndex + 1, Math.min(...[digestIndex, sceneIndex, lines.length].filter(i => i > deltaIndex))) : [];
    const digestLinesRaw = digestIndex !== -1 ? lines.slice(digestIndex + 1, Math.min(...[sceneIndex, lines.length].filter(i => i > digestIndex))) : [];
    const sceneLines = sceneIndex !== -1 ? lines.slice(sceneIndex + 1) : [];

    // Extract JSON objects/arrays
    const deltaJson = this.extractJsonObject(deltaLines);
    const digestJson = this.extractJsonArray(digestLinesRaw);
    const sceneJson = this.extractJsonObject(sceneLines);

    // Parse Deltas
    const deltas: DeltaMap = {};
    for (const key in deltaJson) {
      const instruction = this.parseSingleDelta(key, deltaJson[key]);
      if (instruction) {
        deltas[key] = instruction;
      }
    }

    // Parse Digest Lines
    const digestLines: DigestLine[] = digestJson.map((item: any) => {
      const text = item.text || '';
      const importance = typeof item.importance === 'number' ? item.importance : 3; // Default importance
      const tags = this.extractTags(text);
      return { turn: 0, tags, score: importance, text }; // Turn will be set by LogManager
    }).filter(line => line.text); // Filter out empty lines


    return {
      prose,
      deltas,
      digestLines,
      scene: sceneJson,
    };
  }


  // --- Context Stack Assembly Methods (from StoryForgeViewModel & StackAssembler.kt) ---

  /**
   * Helper to build common prompt structure (similar to private buildBasePrompt in old impl).
   */
  private buildCommonPromptParts(card: PromptCard): Message[] {
    const messages: Message[] = [];

    // NEW: System message about stack order
    messages.push({ role: "system", content: `## Context Stack Order Guidance
The following information is provided to you in a specific order to help you prioritize and integrate details. Focus on the most critical and structured information first, then dynamic elements, and finally conversational history. Adhere to this structure for optimal performance.` });

    messages.push({ role: "system", content: `## Core Scenario / Persona\n${card.prompt}` });

    if (card.gameRules) {
      messages.push({ role: "system", content: `\n## Game Rules\n${card.gameRules}` });
    }

    // AI Output Structure Rules (Emit Skeleton)
    if (card.emitSkeleton) {
      messages.push({ role: "system", content: `\n## AI Output Structure Rules\n${card.emitSkeleton}` });
    }

    // Function Definitions
    if (card.functionDefs) {
      messages.push({ role: "system", content: `\n## Available Functions (JSON)\n\`\`\`json\n${card.functionDefs}\n\`\`\`` });
    }

    // AI Settings Guidance (for context, not direct API params)
    messages.push({ role: "system", content: `\n## AI Configuration Guidance\nTemperature: ${card.aiSettings.temperature}\nMax Tokens: ${card.aiSettings.maxTokens}` });

    return messages;
  }

  buildFirstTurnPrompt(card: PromptCard): Message[] {
    const messages = this.buildCommonPromptParts(card);

    if (card.worldStateInit) {
      messages.push({ role: "system", content: `\n## Initial World State (JSON)\n\`\`\`json\n${card.worldStateInit}\n\`\`\`` });
    }

    // First Turn Specifics (if any)
    if (card.firstTurnOnlyBlock) {
      messages.push({ role: "system", content: `\n## First Turn Specifics\n${card.firstTurnOnlyBlock}` });
    }

    return messages;
  }

  buildEveryTurnPrompt(
    card: PromptCard,
    currentGameState: GameState,
    logEntries: LogEntry[],
    conversationHistory: Message[],
    currentUserAction: string,
    turnNumber: number
  ): Message[] {
    const messages = this.buildCommonPromptParts(card);
    const stackInstructions = card.stackInstructions;

    // === Dynamic Context Stack Assembly (Replicates StackAssembler.kt logic) ===

    // 1. World State Context (from worldStatePolicy)
    if (stackInstructions.worldStatePolicy.enabled && stackInstructions.worldStatePolicy.mode !== StackMode.NEVER) { // NEW: Check enabled flag
      const worldStateJson = JSON.stringify(currentGameState.worldState, null, 2); // Pretty print for readability
      messages.push({ role: "system", content: `\n## Current World State\n\`\`\`json\n${worldStateJson}\n\`\`\`` });
    }

    // 2. Known Entities (from knownEntitiesPolicy)
    if (stackInstructions.knownEntitiesPolicy.enabled && stackInstructions.knownEntitiesPolicy.mode !== StackMode.NEVER) { // NEW: Check enabled flag
        const knownEntitiesList: string[] = this.extractKnownEntities(
            currentGameState.worldState,
            stackInstructions.knownEntitiesPolicy.filtering,
            stackInstructions.knownEntitiesPolicy.n
        );

        if (knownEntitiesList.length > 0) {
            messages.push({ role: "system", content: `\n## Known Entities\n${knownEntitiesList.join('\n')}` });
        }
    }

    // 3. Digest Context (from digestEmission and digestPolicy)
    if (stackInstructions.digestPolicy.enabled && ( // NEW: Check enabled flag for digestPolicy
        stackInstructions.digestEmission[5]?.mode !== StackMode.NEVER ||
        stackInstructions.digestEmission[4]?.mode !== StackMode.NEVER ||
        stackInstructions.digestEmission[3]?.mode !== StackMode.NEVER ||
        stackInstructions.digestEmission[2]?.mode !== StackMode.NEVER ||
        stackInstructions.digestEmission[1]?.mode !== StackMode.NEVER
    )) {
      const relevantDigests: DigestLine[] = [];
      const eligibleLogs = logEntries.filter(log => log.digestLines && log.digestLines.length > 0);
      const sceneTags = this.getSceneTagsFromState(currentGameState.scene, currentGameState.worldState);


      eligibleLogs.forEach(log => {
        log.digestLines.forEach(digestLine => {
          const rule = stackInstructions.digestEmission[digestLine.score];
          if (rule && rule.mode !== StackMode.NEVER) {
            const meetsCondition =
              (rule.mode === StackMode.ALWAYS) ||
              (rule.mode === StackMode.AFTER_N && log.turnNumber >= rule.n) ||
              (rule.mode === StackMode.FIRST_N && log.turnNumber <= rule.n);

            if (meetsCondition) {
              let includeDigest = true;
              if (stackInstructions.digestPolicy.filtering === FilterMode.SCENE_ONLY) {
                if (!digestLine.tags || digestLine.tags.length === 0 || !digestLine.tags.some(tag => sceneTags.includes(tag))) {
                  includeDigest = false;
                }
              } else if (stackInstructions.digestPolicy.filtering === FilterMode.TAGGED) {
                if (!digestLine.tags || digestLine.tags.length === 0) {
                    includeDigest = false;
                }
              }

              if (includeDigest) {
                relevantDigests.push(digestLine);
              }
            }
          }
        });
      });

      relevantDigests.sort((a, b) => a.turnNumber - b.turnNumber);

      if (relevantDigests.length > 0) {
        messages.push({ role: "system", content: `\n## Game Summary Digest\n${relevantDigests.map(d => d.text).join('\n')}` });
      }
    }

    // 4. Expression Log (from expressionLogPolicy)
    if (stackInstructions.expressionLogPolicy.enabled && stackInstructions.expressionLogPolicy.mode !== StackMode.NEVER) { // NEW: Check enabled flag
        const expressionLogContent: string[] = [];
        const filteredLogs = logEntries.filter(log => {
            if (stackInstructions.expressionLogPolicy.filtering === FilterMode.SCENE_ONLY) {
                const tagsInNarratorOutput = this.extractTags(log.narratorOutput);
                const sceneTags = this.getSceneTagsFromState(currentGameState.scene, currentGameState.worldState);
                return tagsInNarratorOutput.some(tag => sceneTags.includes(tag));
            } else if (stackInstructions.expressionLogPolicy.filtering === FilterMode.TAGGED) {
                return this.extractTags(log.narratorOutput).length > 0;
            }
            return true;
        });

        let eligibleExpressionLogs = filteredLogs;
        if (stackInstructions.expressionLogPolicy.mode === StackMode.FIRST_N) {
            eligibleExpressionLogs = eligibleExpressionLogs.filter(log => log.turnNumber <= stackInstructions.expressionLogPolicy.n);
        } else if (stackInstructions.expressionLogPolicy.mode === StackMode.AFTER_N) {
            eligibleExpressionLogs = eligibleExpressionLogs.filter(log => log.turnNumber >= stackInstructions.expressionLogPolicy.n);
        }

        eligibleExpressionLogs.forEach(log => {
            const lines = log.narratorOutput.split('\n').filter(line => line.trim().length > 0);
            const numLines = Math.min(lines.length, stackInstructions.expressionLinesPerCharacter || 3);
            if (numLines > 0) {
                expressionLogContent.push(`Turn ${log.turnNumber} Expression: ${lines.slice(0, numLines).join(' ')}`);
            }
        });

        if (expressionLogContent.length > 0) {
            messages.push({ role: "system", content: `\n## Character Expressions Log\n${expressionLogContent.join('\n')}` });
        }
    }

    // --- End Dynamic Context Assembly ---

    // Append the conversation history *before* the current user action
    // This ensures the AI sees the full history leading up to the current turn.
    messages.push(...conversationHistory);

    // Add the current user's action
    messages.push({ role: "user", content: currentUserAction });

    return messages;
  }

  // Helper function to extract tags from world state for scene/known entities (similar to SceneManager.getSceneTags)
  private getSceneTagsFromState(scene: SceneState, worldState: Record<string, any>): string[] {
    const tags = new Set<string>();

    // Add tags from present entities in scene state
    for (const path of scene.present) {
        const parts = path.split(".");
        if (parts.length >= 2) {
            const category = parts[0];
            const entityKey = parts[1];
            // Access nested tag from worldState (e.g., worldState.npcs.goblin_1.tag)
            const entity = worldState[category]?.[entityKey];
            if (entity && typeof entity === 'object' && entity.tag && typeof entity.tag === 'string') {
                if (entity.tag.startsWith("#") || entity.tag.startsWith("@") || entity.tag.startsWith("$")) {
                    tags.add(entity.tag);
                }
            }
        }
    }

    // Add tag from scene location if it's a symbolic tag
    if (scene.location && (scene.location.startsWith("@") || scene.location.startsWith("#") || scene.location.startsWith("$"))) {
        tags.add(scene.location);
    }

    return Array.from(tags);
  }

  // Helper to extract known entities from world state based on policy
  private extractKnownEntities(
    worldState: Record<string, any>,
    filterMode: FilterMode,
    limit: number
  ): string[] {
    const knownEntities: { tag: string; path: string; fullObject: any }[] = [];

    const traverse = (obj: any, currentPath: string) => {
      if (typeof obj !== 'object' || obj === null) return;

      if (obj.tag && typeof obj.tag === 'string' && (obj.tag.startsWith('#') || obj.tag.startsWith('@') || obj.tag.startsWith('$'))) {
        knownEntities.push({ tag: obj.tag, path: currentPath, fullObject: obj });
      }

      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          traverse(obj[key], currentPath ? `${currentPath}.${key}` : key);
        }
      }
    };

    traverse(worldState, '');

    let filteredEntities = knownEntities;

    if (filterMode === FilterMode.SCENE_ONLY) {
        const sceneTags = this.getSceneTagsFromState(
            { location: null, present: [] },
            worldState
        );

        const currentPresentEntities = new Set(this.getCurrentGameState()?.scene.present || []);

        filteredEntities = filteredEntities.filter(entity => {
            if (currentPresentEntities.has(entity.path)) {
                return true;
            }
            if (entity.tag && sceneTags.includes(entity.tag)) {
                return true;
            }
            return false;
        });
    } else if (filterMode === FilterMode.TAGGED) {
      filteredEntities = filteredEntities.filter(entity => entity.tag && (entity.tag.startsWith('#') || entity.tag.startsWith('@') || entity.tag.startsWith('$')));
    }

    if (limit > 0) {
      filteredEntities = filteredEntities.slice(0, limit);
    }

    return filteredEntities.map(entity => {
        const parts = entity.path.split('.');
        const entityDisplayName = parts[parts.length - 1].replace(/^[#@$]/, '');
        const parentCategory = parts.length > 1 ? parts[parts.length - 2] : null;

        return `${parentCategory ? `${parentCategory}.` : ''}${entityDisplayName} (tag: ${entity.tag})`;
    });
  }
}

export const promptBuilder = new PromptBuilder();