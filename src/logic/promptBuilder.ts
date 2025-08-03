// src/logic/promptBuilder.ts

import { PromptCard, AiSettings } from '../models/PromptCard';
import { GameState, SceneState } from '../models/GameState';
import { LogEntry } from '../models/LogEntry';
import { Message } from '../models/Message';
import { StackMode, FilterMode, StackInstructions, EmissionRule, ProsePolicy } from '../models/StackInstructions'; // Import all specific types
import { DeltaMap, DeltaInstruction } from '../models/DeltaInstruction'; // Used for parsing
import { ParsedNarrationOutput } from '../models/ParsedNarrationOutput'; // The output type for parsing

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
    const stackInstructions = card.stackInstructions; // Use the structured object

    // === Dynamic Context Stack Assembly (Replicates StackAssembler.kt logic) ===

    // 1. World State Context (from worldStatePolicy)
    if (stackInstructions.worldStatePolicy.mode !== StackMode.NEVER) {
      const worldStateJson = JSON.stringify(currentGameState.worldState, null, 2); // Pretty print for readability
      messages.push({ role: "system", content: `\n## Current World State\n\`\`\`json\n${worldStateJson}\n\`\`\`` });
    }

    // 2. Known Entities (from knownEntitiesPolicy)
    // This requires flattening worldState and extracting tagged entities,
    // similar to SceneManager.getSceneTags but for all known entities.
    if (stackInstructions.knownEntitiesPolicy.mode !== StackMode.NEVER) {
        // TODO: Implement logic to extract known entities based on tags and limit 'n'
        // For now, a placeholder or simplified version. This is where you might parse
        // `currentGameState.worldState` to find entities with #, @, $ tags.
        // E.g., from old code: `SceneManager.getSceneTags(_gameState.value.worldState)`
        // This would involve helper function similar to extractTags but for world state keys.
        const knownEntitiesList: string[] = []; // Placeholder for extracted entities
        // Traverse worldState to find tagged entities (e.g., #character, @location, $item)
        for (const categoryKey in currentGameState.worldState) {
          const category = currentGameState.worldState[categoryKey];
          if (typeof category === 'object' && category !== null) {
            for (const entityKey in category) {
              const entity = category[entityKey];
              if (typeof entity === 'object' && entity !== null && entity.tag && typeof entity.tag === 'string') {
                knownEntitiesList.push(`${categoryKey}.${entityKey} (tag: ${entity.tag})`);
              }
            }
          }
        }

        const filteredEntities = stackInstructions.knownEntitiesPolicy.mode === StackMode.FIRST_N
            ? knownEntitiesList.slice(0, stackInstructions.knownEntitiesPolicy.n)
            : knownEntitiesList;

        if (filteredEntities.length > 0) {
            messages.push({ role: "system", content: `\n## Known Entities\n${filteredEntities.join('\n')}` });
        }
    }


    // 3. Digest Context (from digestEmission and digestPolicy)
    // This logic replicates DigestManager.getContextBlock and filtering.
    if (stackInstructions.digestEmission[5]?.mode !== StackMode.NEVER ||
        stackInstructions.digestEmission[4]?.mode !== StackMode.NEVER ||
        stackInstructions.digestEmission[3]?.mode !== StackMode.NEVER ||
        stackInstructions.digestEmission[2]?.mode !== StackMode.NEVER ||
        stackInstructions.digestEmission[1]?.mode !== StackMode.NEVER
    ) {
      const relevantDigests: DigestLine[] = [];
      const eligibleLogs = logEntries.filter(log => log.digestLines && log.digestLines.length > 0);

      eligibleLogs.forEach(log => {
        log.digestLines.forEach(digestLine => {
          const rule = stackInstructions.digestEmission[digestLine.score];
          if (rule && rule.mode !== StackMode.NEVER) {
            const meetsCondition =
              (rule.mode === StackMode.ALWAYS) ||
              (rule.mode === StackMode.AFTER_N && log.turnNumber >= rule.n) ||
              (rule.mode === StackMode.FIRST_N && log.turnNumber <= rule.n); // This interpretation might need refinement based on original Kotlin

            if (meetsCondition) {
              // Apply DigestFilterPolicy if needed (e.g., SCENE_ONLY, TAGGED)
              let includeDigest = true;
              if (stackInstructions.digestPolicy.filtering === FilterMode.SCENE_ONLY) {
                // This would require comparing digestLine.tags with current scene tags from GameState.scene
                // Placeholder: For now, assume any digest is fine if SCENE_ONLY not fully implemented
                // For a full implementation, you'd need to check if digestLine.tags intersect with tags from currentGameState.scene.present/location
                 const sceneTags = this.getSceneTagsFromState(currentGameState.scene, currentGameState.worldState);
                 if (digestLine.tags.every(tag => !sceneTags.includes(tag))) { // If no tags in common
                     includeDigest = false;
                 }
              } else if (stackInstructions.digestPolicy.filtering === FilterMode.TAGGED) {
                // If filtering by tagged, ensure digest has tags
                if (digestLine.tags.length === 0) {
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

      // Sort digests by turn number for chronological order in context
      relevantDigests.sort((a, b) => a.turn - b.turn);

      if (relevantDigests.length > 0) {
        messages.push({ role: "system", content: `\n## Game Summary Digest\n${relevantDigests.map(d => d.text).join('\n')}` });
      }
    }

    // 4. Expression Log (from expressionLogPolicy)
    // This would typically involve parsing specific parts of rawNarratorOutput or LogEntry content.
    // Assuming for MVP it might be simpler or not fully implemented without specific data.
    if (stackInstructions.expressionLogPolicy.mode === StackMode.ALWAYS) {
        // TODO: Implement expression log extraction. This might involve parsing
        // specific sections of previous narrator outputs or dedicated log fields.
        // For now, it's a placeholder.
        const expressionLogContent: string[] = [];
        // You might iterate through logEntries and extract 'expression' type logs or specific parts of prose.
        // Example: logEntries.forEach(log => { if (log.expressionText) expressionLogContent.push(log.expressionText); });
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

}

// Export a singleton instance of the prompt builder.
export const promptBuilder = new PromptBuilder();