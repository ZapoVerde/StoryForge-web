// src/logic/deltaParser.ts
import type { DeltaInstruction, DeltaMap,DigestLine, ParsedNarrationOutput} from '../models';

// Exported Marker constants
export const DELTA_MARKER = "@delta";
export const DIGEST_MARKER = "@digest";
export const SCENE_MARKER = "@scene";

/**
 * Extracts a JSON object from a string, handling potential parsing errors.
 * This function expects the *raw JSON string*, not lines including fences.
 * @param jsonString The raw JSON string.
 * @returns A JSON object, or an empty object on error.
 */
function extractJsonObject(jsonString: string): Record<string, unknown> {
  const text = jsonString.trim();
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
 * Extracts a JSON array from a string, handling potential parsing errors.
 * This function expects the *raw JSON string*, not lines including fences.
 * @param jsonString The raw JSON string.
 * @returns A JSON array, or an empty array on error.
 */
function extractJsonArray(jsonString: string): unknown[] {
  const text = jsonString.trim();
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
 * Extracts content from a markdown-fenced JSON block.
 * Looks for ```json and ```. Also includes a fallback for unfenced blocks
 * if a JSON start character is found immediately after the marker.
 * @param lines The full array of lines from AI output.
 * @param startIndex The index of the marker line (e.g., @delta).
 * @returns The raw JSON string content, or an empty string if not found.
 */
function extractFencedJsonBlock(lines: string[], startIndex: number): string {
    if (startIndex < 0 || startIndex >= lines.length) {
        return "";
    }

    let jsonLines: string[] = [];
    let inJsonBlock = false;
    let fenceFound = false;

    // Start searching from the line *after* the marker
    for (let i = startIndex + 1; i < lines.length; i++) {
        const line = lines[i].trim();

        if (line.startsWith("```")) {
            if (!inJsonBlock) {
                // Found opening fence
                inJsonBlock = true;
                fenceFound = true;
                // If there's content *after* ```json on the same line
                const contentAfterFence = line.substring(line.indexOf('{'));
                if(contentAfterFence.startsWith('{') || contentAfterFence.startsWith('[')) {
                    jsonLines.push(contentAfterFence);
                }
                continue;
            } else {
                // Found closing fence
                break;
            }
        }

        if (inJsonBlock) {
            jsonLines.push(lines[i]);
        } else if (!fenceFound && (line.startsWith("{") || line.startsWith("["))) {
            // If no fence was found yet, but we encounter a JSON start,
            // assume it's an unfenced block and start capturing.
            // This is a fallback for AIs that don't use fences.
            inJsonBlock = true;
            jsonLines.push(lines[i]);
        } else if (inJsonBlock && !fenceFound && !line.startsWith("{") && !line.startsWith("[")) {
            // If we're in an unfenced block but encounter a non-JSON line, stop.
            break;
        }
    }

    return jsonLines.join('\n').trim();
}

/**
 * Parses a key-value pair from the AI's delta JSON into a DeltaInstruction.
 * Corresponds to `DeltaInstruction.fromJsonElement` from the old project.
 * The raw key is expected to be in the format `+player.gold` or `=npcs.goblin.hp`.
 * @param rawKey The raw key from the JSON, e.g., "+player.gold".
 * @param value The JSON value associated with the key.
 * @returns A DeltaInstruction object or null if parsing fails.
 */
function parseSingleDelta(rawKey: string, value: unknown): DeltaInstruction | null {
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

  const firstMarkerIndex = [deltaIndex, digestIndex, sceneIndex]
    .filter(index => index !== -1)
    .reduce((min, current) => Math.min(min, current), lines.length);

  const prose = lines.slice(0, firstMarkerIndex).join('\n').trim();

  // Use the new helper to extract the raw JSON strings
  const deltaJsonString = extractFencedJsonBlock(lines, deltaIndex);
  const digestJsonString = extractFencedJsonBlock(lines, digestIndex);
  const sceneJsonString = extractFencedJsonBlock(lines, sceneIndex);

  const deltaJson = extractJsonObject(deltaJsonString);
  const digestJson = extractJsonArray(digestJsonString);
  const sceneJson = extractJsonObject(sceneJsonString);

  // --- Parse Deltas ---
  const deltas: DeltaMap = {};
  for (const key in deltaJson) {
    const instruction = parseSingleDelta(key, deltaJson[key]);
    if (instruction) {
      deltas[key] = instruction;
    }
  }

  // --- Parse Digest Lines ---
  const digestLines: DigestLine[] = digestJson.map((item) => {
    const { text = '', importance } = item as { text?: string; importance?: number };
    const finalImportance = typeof importance === 'number' ? importance : 3;
    // Extract tags from text using regex, as in original NarrationParser
    const tagPattern = /[#@$][a-zA-Z0-9_]+/g;
    const tags = text.match(tagPattern) || [];
    return { text, importance: finalImportance, tags };
  }).filter(line => line.text); // Filter out empty lines

  return {
    prose,
    deltas,
    digestLines,
    scene: sceneJson,
  };
}