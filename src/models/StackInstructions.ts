// src/models/StackInstructions.ts

/**
 * Defines the mode for including a stack element.
 * Now an enum to allow runtime access (e.g., Object.values).
 */
export enum StackMode {
  ALWAYS = 'always',
  FIRST_N = 'firstN',
  AFTER_N = 'afterN',
  NEVER = 'never',
  FILTERED = 'filtered', // Added if 'filtered' applies to modes
}

/**
 * Defines the filtering strategy for a stack element.
 * Now an enum to allow runtime access.
 */
export enum FilterMode {
  NONE = 'none',
  SCENE_ONLY = 'sceneOnly',
  TAGGED = 'tagged',
}

/**
 * Defines a policy for including prose or other list-based context.
 * Corresponds to `ProsePolicy`.
 */
export interface ProsePolicy {
  mode: StackMode; // Use the enum
  n: number;
  filtering: FilterMode; // Use the enum
  enabled?: boolean; // NEW: Added for toggling the entire section
}

/**
 * Defines a rule for emitting digest lines based on their importance score.
 * Corresponds to `EmissionRule`.
 */
export interface EmissionRule {
  mode: StackMode; // Use the enum
  n: number;
}

/**
 * Defines the policy for filtering digest lines.
 * Corresponds to `DigestFilterPolicy`.
 */
export interface DigestFilterPolicy {
  filtering: FilterMode; // Use the enum
  enabled?: boolean; // NEW: Added for toggling the entire section
}

/**
 * Defines the policy for token usage and fallback strategies.
 * Corresponds to `TokenPolicy`.
 */
export interface TokenPolicy {
  minTokens: number;
  maxTokens: number;
  fallbackPlan: string[];
}

/**
 * The full, structured stack instructions for a PromptCard.
 * Corresponds to `StackInstructions.kt`.
 */
export interface StackInstructions {
  narratorProseEmission: ProsePolicy;
  digestPolicy: DigestFilterPolicy;
  digestEmission: Record<number, EmissionRule>; // Map<Int, EmissionRule> -> Record<number, EmissionRule>

  expressionLogPolicy: ProsePolicy;
  expressionLinesPerCharacter: number;
  emotionWeighting: boolean;

  worldStatePolicy: ProsePolicy;
  knownEntitiesPolicy: ProsePolicy;

  outputFormat: string;
  tokenPolicy: TokenPolicy;
}