// src/models/PromptCard.ts

import { StackInstructions } from './StackInstructions'; // Import the new StackInstructions

/**
 * Defines the configuration settings for an AI connection.
 * These fields are embedded directly within PromptCard.
 * This is a pure data definition, with no default values.
 */
export interface AiSettingsInCard {
  selectedConnectionId: string;
  temperature: number;
  topP: number;
  maxTokens: number;
  presencePenalty: number;
  frequencyPenalty: number;
  functionCallingEnabled: boolean;
}

/**
 * A self-contained prompt card that can be submitted to the AI to configure tone, rules, or scenario.
 * This version consolidates AiSettings and uses a structured StackInstructions object.
 * This is a pure data definition, with no default values or logic.
 */
export interface PromptCard {
  // Web-specific lineage and deduplication fields (as per initial migration plan)
  id: string;
  rootId: string;
  parentId: string | null; // Null for root cards
  contentHash: string; // Hash of significant content fields to detect duplicates

  // Fields directly from old PromptCard.kt
  title: string;
  description: string | null; // Optional in Kotlin, so `string | null`
  prompt: string;
  firstTurnOnlyBlock: string;
  stackInstructions: StackInstructions; // Now a structured object
  emitSkeleton: string;      // JSON string
  worldStateInit: string;    // JSON string
  gameRules: string;
  aiSettings: AiSettingsInCard;
  helperAiSettings: AiSettingsInCard;
  tags: string[];            // Kotlin `List<String>` maps to `string[]`
  isExample: boolean;        // From Kotlin `isExample`
  functionDefs: string;      // JSON string

  // Additional web-specific metadata (as per initial migration plan)
  isPublic: boolean;
  createdAt: string; // ISO 8601 string
  updatedAt: string; // ISO 8601 string
  ownerId: string;   // Firebase User UID
}

/**
 * Represents the raw data needed when creating or updating a PromptCard.
 * This does not include generated fields like IDs, hashes, timestamps, or ownerId,
 * nor does it specify default values for optional fields.
 */
export interface NewPromptCardData {
  title: string;
  prompt: string;
  description?: string | null;
  firstTurnOnlyBlock?: string;
  // This is kept as 'string | StackInstructions' to allow raw JSON string input,
  // with parsing logic to convert it to StackInstructions handled elsewhere (e.g., in logic/cardManager or data repository).
  stackInstructions?: string | StackInstructions;
  emitSkeleton?: string;
  worldStateInit?: string;
  gameRules?: string;
  aiSettings?: AiSettingsInCard;
  helperAiSettings?: AiSettingsInCard;
  tags?: string[];
  isExample?: boolean;
  functionDefs?: string;
  isPublic?: boolean;
}