// src/models/StackInstructions.ts

/**
 * Defines the mode for including a stack element.
 * Corresponds to the `StackMode` enum.
 */
// export type StackMode = 'always' | 'firstN' | 'afterN' | 'never' | 'filtered'; // OLD
export const StackModes = {
  ALWAYS: 'always',
  FIRST_N: 'firstN',
  AFTER_N: 'afterN',
  NEVER: 'never',
  FILTERED: 'filtered' // Added 'filtered' from your type alias
} as const;
export type StackMode = typeof StackModes[keyof typeof StackModes];


/**
 * Defines the filtering strategy for a stack element.
 * Corresponds to the `FilterMode` enum.
 */
// export type FilterMode = 'none' | 'sceneOnly' | 'tagged'; // OLD
export const FilterModes = {
  NONE: 'none',
  SCENE_ONLY: 'sceneOnly',
  TAGGED: 'tagged'
} as const;
export type FilterMode = typeof FilterModes[keyof typeof FilterModes];


/**
 * Defines a policy for including prose or other list-based context.
 * Corresponds to `ProsePolicy`.
 */
export interface ProsePolicy {
  mode: StackMode;
  n: number;
  filtering: FilterMode;
}

/**
 * Defines a rule for emitting digest lines based on their importance score.
 * Corresponds to `EmissionRule`.
 */
export interface EmissionRule {
  mode: StackMode;
  n: number;
}

/**
 * Defines the policy for filtering digest lines.
 * Corresponds to `DigestFilterPolicy`.
 */
export interface DigestFilterPolicy {
  filtering: FilterMode;
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