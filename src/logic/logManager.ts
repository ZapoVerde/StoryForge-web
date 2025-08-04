// src/logic/logManager.ts

import type{ LogEntry } from '../models/LogEntry';
import type{ ParsedNarrationOutput } from '../models/ParsedNarrationOutput';
import type{ AiSettings, PromptCard } from '../models/PromptCard'; // For AI settings from the card
import type{ DeltaInstruction, DeltaMap } from '../models/DeltaInstruction'; // For the DeltaMap type
import type{ DigestLine, TokenSummary, LogErrorFlag } from '../models/LogEntryElements'; // For related types
import { DELTA_MARKER } from './deltaParser'; // Import DELTA_MARKER

/**
 * Interface defining the contract for the Log Manager.
 */
export interface ILogManager {
 /**
  * Assembles a complete LogEntry for a single turn of the game.
  * This centralizes the logic from TurnLogAssembler and DigestManager.addParsedLines.
  * @param params An object containing all necessary data for the log entry.
  * @returns A fully constructed LogEntry object.
  */
 assembleTurnLogEntry(params: {
  turnNumber: number;
  userInput: string;
  rawNarratorOutput: string;
  parsedOutput: ParsedNarrationOutput; // Output from deltaParser.ts
  contextSnapshot: string; // The full prompt string sent to AI
  tokenUsage: TokenSummary | null;
  aiSettings: AiSettings; // The AI settings used for this turn
  apiRequestBody: string | null;
  apiResponseBody: string | null;
  apiUrl: string | null;
  latencyMs: number | null;
  modelSlugUsed: string;
 }): LogEntry;

 /**
  * Infers digest lines from deltas if no explicit digest was provided by the AI.
  * Replicates logic from DigestManager.addParsedLines.
  * @param deltas The map of DeltaInstruction objects.
  * @param prose Optional: the prose of the turn, for extracting first line as digest.
  * @returns An array of inferred DigestLine objects.
  */
 inferDigestLinesFromDeltas(deltas: DeltaMap, prose?: string): DigestLine[];
}

/**
 * Concrete implementation of ILogManager.
 */
class LogManager implements ILogManager {

 inferDigestLinesFromDeltas(deltas: DeltaMap, prose?: string): DigestLine[] {
  const inferredDigests: DigestLine[] = [];

  if (Object.keys(deltas).length === 0) {
   return inferredDigests;
  }

  for (const rawKey in deltas) {
   const instruction = deltas[rawKey];
   let score = 1; // Default low importance

   // Logic from DigestManager.addParsedLines to infer importance
   if (rawKey.startsWith("player.")) {
    score = 5; // Player-related changes are critical
   } else if (rawKey.startsWith("world.")) {
    score = 5; // World-related changes are critical
   } else if (rawKey.includes(".flags.")) {
    score = 4;
   } else if (rawKey.includes(".status")) {
    score = 3;
   } else if (rawKey.startsWith("+") || rawKey.startsWith("!")) {
    score = 2; // Add or Declare operations
   }

   // Logic from DeltaInstruction.toLogValue() for summary text
   let summaryText = `Unknown delta operation: ${rawKey}`;
   if (instruction.op === 'assign') {
    summaryText = `Set ${instruction.key} = ${JSON.stringify(instruction.value)}`;
   } else if (instruction.op === 'add') {
    summaryText = `Added to ${instruction.key}: ${JSON.stringify(instruction.value)}`;
   } else if (instruction.op === 'declare') {
    // Inferred tag logic, similar to DigestManager
    let taggableKey = instruction.key;
    const pathParts = instruction.key.split(".");
    if (pathParts.length >= 2) {
      const category = pathParts[0];
      const entity = pathParts[1];
      // Infer if this is a character or location declaration for a summary
      const valueAsObject = instruction.value as Record<string, any>;
      if (valueAsObject && (valueAsObject.tag === "character" || valueAsObject.tag === "location")) {
        taggableKey = (valueAsObject.tag === "character" ? "#" : "@") + entity;
      }
    }
    summaryText = `Declared ${taggableKey} as ${JSON.stringify(instruction.value)}`;
   } else if (instruction.op === 'delete') {
    summaryText = `Removed ${instruction.key}`;
   }

  const tags = this.extractTags(summaryText); // Extract tags from the generated summary
    // MODIFIED: Use `importance: score` to match the DigestLine model
   inferredDigests.push({ text: summaryText, importance: score, tags });
  }

  // Optional prose line extraction from DigestManager.addParsedLines
  if (prose && prose.trim().length > 10) {
   const firstLine = prose.trim().split(/[.!?\n]/).find(line => line.trim().length > 10)?.trim();
   if (firstLine) {
    const tags = this.extractTags(firstLine);
      // MODIFIED: Use `importance: 3`
    inferredDigests.push({ text: firstLine, importance: 3, tags });
   }
  }

  // Assign consistent turn number AFTER all are collected
  // MODIFIED: Remove turn property, as it's not in the DigestLine model. It's part of the parent LogEntry.
  return inferredDigests;
}

 private extractTags(text: string): string[] {
  const tagPattern = /[#@$][a-zA-Z0-9_]+/g; // Global flag to find all matches
  const matches = text.match(tagPattern);
  return matches || [];
 }

 assembleTurnLogEntry(params: {
  turnNumber: number;
  userInput: string;
  rawNarratorOutput: string;
  parsedOutput: ParsedNarrationOutput;
  contextSnapshot: string;
  tokenUsage: TokenSummary | null;
  aiSettings: AiSettings;
  apiRequestBody: string | null;
  apiResponseBody: string | null;
  apiUrl: string | null;
  latencyMs: number | null;
  modelSlugUsed: string;
 }): LogEntry {
  const now = new Date().toISOString();
  const {
   turnNumber, userInput, rawNarratorOutput, parsedOutput,
   contextSnapshot, tokenUsage, aiSettings, apiRequestBody,
   apiResponseBody, apiUrl, latencyMs, modelSlugUsed
  } = params;

  let digestLines: DigestLine[] = parsedOutput.digestLines || [];
  if (digestLines.length === 0 && parsedOutput.deltas) {
   // If AI didn't provide digest, infer from deltas
   digestLines = this.inferDigestLinesFromDeltas(parsedOutput.deltas, parsedOutput.prose);
  }
  // Ensure correct turn number for inferred digests
  digestLines = digestLines.map(d => ({ ...d, turn: turnNumber }));


  const errorFlags: LogErrorFlag[] = [];
  // Basic error checking (can be expanded)
  if (!parsedOutput.prose) {
   errorFlags.push('MISSING_PROSE');
  }
  // Now using DELTA_MARKER imported from deltaParser
  if (parsedOutput.deltas && Object.keys(parsedOutput.deltas).length === 0 && rawNarratorOutput.includes(DELTA_MARKER)) {
    // If the delta marker was present but no deltas were parsed
    errorFlags.push('INVALID_JSON_DELTA');
  }
  if (!tokenUsage || tokenUsage.totalTokens <= 0) {
   errorFlags.push('INVALID_TOKEN_USAGE');
  }
  // Add more validation based on your `LogErrorFlag` enum/sealed class
  // e.g., if (rawNarratorOutput.length < 50) { errorFlags.push('AI_RESPONSE_TOO_SHORT'); }


  return {
   turnNumber: turnNumber,
   timestamp: now,
   userInput: userInput,
   narratorOutput: rawNarratorOutput,
   prose: parsedOutput.prose, // ADDED: Save the clean prose here
   digestLines: digestLines, // Now an array
   deltas: parsedOutput.deltas,
   contextSnapshot: contextSnapshot,
   tokenUsage: tokenUsage,
   apiRequestBody: apiRequestBody,
   apiResponseBody: apiResponseBody,
   apiUrl: apiUrl,
   latencyMs: latencyMs,
   aiSettings: aiSettings,
   errorFlags: errorFlags,
   modelSlugUsed: modelSlugUsed,
  };
 }
}

export const logManager = new LogManager();