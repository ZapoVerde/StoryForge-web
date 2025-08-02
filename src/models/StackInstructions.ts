// src/models/StackInstructions.ts

/**
 * Defines the policy for how narrator prose is emitted.
 */
export interface NarratorProseEmissionPolicy {
  mode: "firstN" | "always" | "never";
  n?: number;
  filtering: "sceneOnly" | "tagged" | "none";
}

/**
 * Defines the policy for how digest summaries are handled.
 */
export interface DigestPolicy {
  filtering: "tagged" | "none";
}

/**
 * Defines how digest emissions (summaries) are handled based on importance score.
 * Keys are importance scores (1-5), values define the mode for that score.
 */
export interface DigestEmissionPolicy {
  "1": { mode: "never" | "always" | "firstN" | "afterN"; n?: number };
  "2": { mode: "never" | "always" | "firstN" | "afterN"; n?: number };
  "3": { mode: "never" | "always" | "firstN" | "afterN"; n?: number };
  "4": { mode: "never" | "always" | "firstN" | "afterN"; n?: number };
  "5": { mode: "never" | "always" | "firstN" | "afterN"; n?: number };
}

/**
 * Defines the policy for how expression logs are handled.
 */
export interface ExpressionLogPolicy {
  mode: "always" | "never";
  filtering: "sceneOnly" | "tagged" | "none";
}

/**
 * Defines the policy for how world state is handled.
 */
export interface WorldStatePolicy {
  mode: "filtered" | "none";
  filtering: "sceneOnly" | "tagged" | "none";
}

/**
 * Defines the policy for how known entities are handled.
 */
export interface KnownEntitiesPolicy {
  mode: "firstN" | "always" | "never";
  n?: number;
  filtering: "tagged" | "none";
}

/**
 * Defines the policy for token usage, including fallbacks.
 */
export interface TokenPolicy {
  minTokens: number;
  maxTokens: number;
  fallbackPlan: string[];
}

/**
 * Represents the structured "stack instructions" JSON for a PromptCard.
 * This guides how the AI context and output are managed.
 * This is a pure data definition, with no default values or logic.
 */
export interface StackInstructions {
  narratorProseEmission: NarratorProseEmissionPolicy;
  digestPolicy: DigestPolicy;
  digestEmission: DigestEmissionPolicy;
  expressionLogPolicy: ExpressionLogPolicy;
  expressionLinesPerCharacter: number;
  emotionWeighting: boolean;
  worldStatePolicy: WorldStatePolicy;
  knownEntitiesPolicy: KnownEntitiesPolicy;
  outputFormat: string;
  tokenPolicy: TokenPolicy;
}