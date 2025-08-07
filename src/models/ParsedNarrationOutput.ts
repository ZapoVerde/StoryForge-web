// src/models/ParsedNarrationOutput.ts

import type { DeltaMap, DigestLine} from './index';

/**
 * Represents the structured data extracted from a raw AI narrator response.
 * Corresponds to `NarrationParser.ParsedNarration` from the old project.
 *
 * @param prose The clean, human-readable narrative text.
 * @param deltas A map of world state changes to apply.
 * @param digestLines An array of summary lines.
 * @param scene A flexible JSON object describing the current scene (location, present characters, etc.).
 */
export interface ParsedNarrationOutput {
  prose: string;
  deltas: DeltaMap;
  digestLines: DigestLine[];
  scene?: Record<string, any> | null; // Corresponds to the JsonObject? for the @scene block
}