// src/logic/deltaParser.ts

import type { DeltaInstruction, DeltaMap } from '../models/DeltaInstruction.ts';
import type { DigestLine } from '../models/LogEntryElements.ts';
import type { ParsedNarrationOutput } from '../models/ParsedNarrationOutput.ts';

const DELTA_MARKER = "@delta";
const DIGEST_MARKER = "@digest";
const SCENE_MARKER = "@scene";

/**
 * Extracts a JSON object from a list of lines, handling potential parsing errors.
 * @param lines The lines of text containing the JSON.
 * @returns A JSON object, or an empty object on error.
 */
function extractJsonObject(lines: string[]): Record<string, unknown> {
  const text = lines.join('\n').trim();
  if (!text) return {};
  try {
    const parsed = JSON.parse(text);
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? parsed : {};
  } catch (e: unknown) {
    console.error("Failed to parse JSON object:", e, "\nText:", text);
    return {};
  }
}

/**
 * Extracts a JSON array from a list of lines, handling potential parsing errors.
 * @param lines The lines of text containing the JSON array.
 * @returns A JSON array, or an empty array on error.
 */
function extractJsonArray(lines: string[]): unknown[] {
  const text = lines.join('\n').trim();
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e: unknown) {
    console.error("Failed to parse JSON array:", e, "\nText:", text);
    return [];
  }
}

/**
 * Parses a key-value pair from the AI's delta JSON into a DeltaInstruction.
 * Corresponds to `DeltaInstruction.fromJsonElement` from the old project.
 * The raw key is expected to be in the format `+player.gold` or `=npcs.goblin.hp`.
 * @param rawKey The raw key from the JSON, e.g., "+player.gold".
 * @param value The JSON value associated with the key.
 * @returns A DeltaInstruction object or null if parsing fails.
 */
function parseSingleDelta(rawKey: string, value: any): DeltaInstruction | null {
  const op = rawKey.charAt(0);
  const path = rawKey.substring(1); // The rest of the key, e.g., "player.gold"

  switch (op) {
    case '+':
      return { op: 'add', key: path, value: value };
    case '=':
      return { op: 'assign', key: path, value: value };
    case '!':
      return { op: 'declare', key: path, value: value };
    case '-':
      return { op: 'delete', key: path };
    default:
      console.warn(`Invalid delta operation character '${op}' in key '${rawKey}'`);
      return null;
  }
}

/**
 * Parses the raw AI response string into a structured ParsedNarrationOutput object.
 * This function replicates the logic of `NarrationParser.extractJsonAndCleanNarration`.
 * @param rawAiOutput The full, raw string from the AI model.
 * @returns A ParsedNarrationOutput object.
 */
export function parseNarratorOutput(rawAiOutput: string): ParsedNarrationOutput {
  const lines = rawAiOutput.split('\n');

  const deltaIndex = lines.findIndex(line => line.trim() === DELTA_MARKER);
  const digestIndex = lines.findIndex(line => line.trim() === DIGEST_MARKER);
  const sceneIndex = lines.findIndex(line => line.trim() === SCENE_MARKER);

  const proseEndIndex = [deltaIndex, digestIndex, sceneIndex]
    .filter(index => index !== -1)
    .reduce((min, current) => Math.min(min, current), lines.length);

  const prose = lines.slice(0, proseEndIndex).join('\n').trim();

  const deltaLines = deltaIndex !== -1 ? lines.slice(deltaIndex + 1, digestIndex > deltaIndex ? digestIndex : (sceneIndex > deltaIndex ? sceneIndex : lines.length)) : [];
  const digestLinesRaw = digestIndex !== -1 ? lines.slice(digestIndex + 1, sceneIndex > digestIndex ? sceneIndex : lines.length) : [];
  const sceneLines = sceneIndex !== -1 ? lines.slice(sceneIndex + 1) : [];

  const deltaJson = extractJsonObject(deltaLines);
  const digestJson = extractJsonArray(digestLinesRaw);
  const sceneJson = extractJsonObject(sceneLines);

  // --- Parse Deltas ---
  const deltas: DeltaMap = {};
  for (const key in deltaJson) {
    const instruction = parseSingleDelta(key, deltaJson[key]);
    if (instruction) {
      deltas[key] = instruction;
    }
  }

  // --- Parse Digest Lines ---
  const digestLines: DigestLine[] = digestJson.map((item: any, index: number) => {
    const text = item.text || '';
    const importance = typeof item.importance === 'number' ? item.importance : 3;
    // Extract tags from text using regex, as in original NarrationParser
    const tagPattern = /[#@$][a-zA-Z0-9_]+/g;
    const tags = text.match(tagPattern) || [];
    return { text, importance, tags };
  }).filter(line => line.text); // Filter out empty lines

  return {
    prose,
    deltas,
    digestLines,
    scene: sceneJson,
  };
}