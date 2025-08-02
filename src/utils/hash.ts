// src/utils/hash.ts

import { PromptCard, AiSettingsInCard, StackInstructions } from '../models/PromptCard';
import { StackInstructions as StackInstructionsModel } from '../models/StackInstructions';


/**
 * Generates a simple, non-cryptographic hash from a string.
 * This is suitable for content deduplication checks within the application.
 *
 * Based on the 'sdbm' hash algorithm.
 * @param str The input string to hash.
 * @returns A string representation of the hash.
 */
export function generateContentHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = char + (hash << 6) + (hash << 16) - hash; // sdbm hash algorithm
  }
  // Convert to unsigned 32-bit integer and then to hex string
  return (hash >>> 0).toString(16);
}

/**
 * Creates a normalized string representation of key PromptCard content for hashing.
 * This function defines which fields are considered for deduplication.
 * It's important that this function is deterministic: the same input should always
 * produce the same output string.
 * @param card The PromptCard object (or partial object containing relevant fields).
 * @returns A string representing the key content of the card.
 */
export function getPromptCardContentForHash(card: {
  title: string;
  description: string | null;
  prompt: string;
  firstTurnOnlyBlock: string;
  stackInstructions: StackInstructions | string; // Can be object or string, needs to be stringified
  emitSkeleton: string;
  worldStateInit: string;
  gameRules: string;
  tags: string[];
  functionDefs: string;
  aiSettings: AiSettingsInCard; // Include AI settings in hash as they affect "content"
  helperAiSettings: AiSettingsInCard; // Include helper AI settings
}): string {
  // Use a consistent order and join method to ensure same content yields same hash
  // Sort tags for consistent hashing regardless of input order
  const sortedTags = [...(card.tags || [])].sort().join(',');

  // Stringify complex objects for consistent hashing.
  // We need to handle both the structured StackInstructions object and a potential raw JSON string input.
  const stackInstructionsString = typeof card.stackInstructions === 'object'
    ? JSON.stringify(card.stackInstructions)
    : (card.stackInstructions || '');

  // Stringify AI settings objects consistently
  const aiSettingsString = JSON.stringify(card.aiSettings);
  const helperAiSettingsString = JSON.stringify(card.helperAiSettings);

  // Concatenate all relevant content fields.
  // Order matters here for deterministic hashing.
  return [
    card.title,
    card.description || '', // Treat null as empty string for hashing
    card.prompt,
    card.firstTurnOnlyBlock,
    stackInstructionsString,
    card.emitSkeleton,
    card.worldStateInit,
    card.gameRules,
    aiSettingsString,
    helperAiSettingsString,
    sortedTags,
    card.functionDefs,
  ].join('|||'); // Use a distinctive separator to avoid accidental matches
}