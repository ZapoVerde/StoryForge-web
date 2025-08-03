// src/models/LogEntry.ts

import { DeltaMap } from './DeltaInstruction';
import { DigestLine, TokenSummary, LogErrorFlag } from './LogEntryElements';
import { AiSettingsInCard } from './PromptCard';

/**
 * Canonical structured log for a single turn or significant event in the game.
 * Corresponds to TurnLogEntry.kt, enhanced with insights from DigestManager.
 */
export interface LogEntry {
  turnNumber: number;
  timestamp: string;

  userInput: string;
  narratorOutput: string;

  // CHANGED: digestLines is now an array to hold multiple digests per turn
  digestLines: DigestLine[];
  deltas?: DeltaMap | null;

  contextSnapshot?: string | null;
  tokenUsage?: TokenSummary | null;
  apiRequestBody?: string | null;
  apiResponseBody?: string | null;
  apiUrl?: string | null;
  latencyMs?: number | null;

  aiSettings?: AiSettingsInCard | null;
  errorFlags: LogErrorFlag[];
  modelSlugUsed: string;
}