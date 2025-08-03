// src/models/LogEntryElements.ts

/**
 * Represents a single summary line for the digest, as per DigestLine.kt (implied by TurnLogEntry).
 */
export interface DigestLine {
  text: string;
  importance: number; // 1 (minor) to 5 (critical)
  tags?: string[];    // Optional, e.g., for filtering by specific entities
}

/**
 * Summarizes token usage for an AI call, as per TokenSummary.kt (implied by TurnLogEntry).
 */
export interface TokenSummary {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cachedTokens?: number; // Optional: If some tokens were served from cache
}

/**
 * Represents a flag for a validation error or issue in the log entry.
 * Based on `LogErrorFlag` (implied enum/sealed class from `TurnLogEntry`).
 */
export type LogErrorFlag =
  | 'MISSING_PROSE'
  | 'MISSING_DELTAS'
  | 'INVALID_JSON_DELTA'
  | 'INVALID_TOKEN_USAGE'
  | 'AI_RESPONSE_TOO_SHORT'
  | 'AI_RESPONSE_TOO_LONG'
  | 'UNEXPECTED_AI_FORMAT'
  | 'API_ERROR'
  | 'UNKNOWN_ERROR';
// Add more flags as needed based on your LogErrorFlag enum/sealed class if it exists.