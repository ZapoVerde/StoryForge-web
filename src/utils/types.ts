// src/utils/types.ts

export enum LogViewMode {
  USER_INPUT = 'User Input',
  NARRATOR_OUTPUT = 'Narrator Output (Parsed Prose)',
  RAW_NARRATOR_OUTPUT = 'Raw Narrator Output (Full AI Response)',
  DIGEST_LINES = 'Digest Lines',
  DELTAS = 'Deltas',
  CONTEXT_SNAPSHOT = 'Context Snapshot (Prompt)',
  TOKEN_USAGE = 'Token Usage',
  AI_SETTINGS = 'AI Settings',
  API_DETAILS = 'API Details (URL, Latency)', // This will now be for metadata only
  API_REQUEST_BODY = 'API Request Body',     // ADD THIS
  API_RESPONSE_BODY = 'API Response Body',   // ADD THIS
  MODEL_SLUG_USED = 'Model Slug Used',
  ERROR_FLAGS = 'Error Flags',
}