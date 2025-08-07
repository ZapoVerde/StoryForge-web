// src/models/LogEntry.ts

import type { DeltaMap, DigestLine, TokenSummary, LogErrorFlag, AiSettings } from './index';

/**
 * Canonical structured log for a single turn or significant event in the game.
 * Corresponds to TurnLogEntry.kt, enhanced with insights from DigestManager.
 */
export interface LogEntry {
 turnNumber: number;
 timestamp: string;

 userInput: string;
 narratorOutput: string; // The raw, full output from the AI
 prose: string; 

 digestLines: DigestLine[];
 deltas?: DeltaMap | null;

 contextSnapshot?: string | null;
 tokenUsage?: TokenSummary | null;
 apiRequestBody?: string | null;
 apiResponseBody?: string | null;
 apiUrl?: string | null;
 latencyMs?: number | null;

 aiSettings?: AiSettings | null;
 errorFlags: LogErrorFlag[];
 modelSlugUsed: string;
}