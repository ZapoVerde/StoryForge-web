// src/data/config/promptCardDefaults.ts

// In src/data/config/promptCardDefaults.ts
import type { AiSettings, StackInstructions} from '../../models';
import  { StackMode, FilterMode} from '../../models';

/**
 * Default AI settings to be used for PromptCards if not specified.
 * Corresponds to AiSettings.kt's default values, now embedded in PromptCard.
 */
export const defaultAiSettingsInCard: AiSettings = {
  selectedConnectionId: "",
  temperature: 0.7,
  topP: 1.0,
  maxTokens: 2048,
  presencePenalty: 0.0,
  frequencyPenalty: 0.0,
  functionCallingEnabled: false,
};

/**
 * Default structured StackInstructions object.
 * This is the parsed object version of the default JSON string from PromptCardDefaults.kt.
 */
export const defaultStackInstructions: StackInstructions = {
  narratorProseEmission: { mode: StackMode.FIRST_N, n: 3, filtering: FilterMode.SCENE_ONLY, enabled: true },
  digestPolicy: { filtering: FilterMode.TAGGED, enabled: true },
  digestEmission: {
    "5": { mode: StackMode.ALWAYS },
    "4": { mode: StackMode.AFTER_N, n: 1 },
    "3": { mode: StackMode.FIRST_N, n: 6 },
    "2": { mode: StackMode.FIRST_N, n: 3 },
    "1": { mode: StackMode.NEVER },
  },
  expressionLogPolicy: { mode: StackMode.ALWAYS, n: 0, filtering: FilterMode.SCENE_ONLY, enabled: true }, // ADDED n: 0
  expressionLinesPerCharacter: 3,
  emotionWeighting: true,
  worldStatePolicy: { mode: StackMode.FILTERED, n: 0, filtering: FilterMode.SCENE_ONLY, enabled: true }, // ADDED n: 0
  knownEntitiesPolicy: { mode: StackMode.FIRST_N, n: 2, filtering: FilterMode.TAGGED, enabled: true },
  // REMOVED: "outputFormat": "prose_digest_emit",
  tokenPolicy: {
    minTokens: 1000,
    maxTokens: 4096,
    fallbackPlan: [
      "drop_known_entities",
      "drop_low_importance_digest",
      "truncate_expression_logs",
    ],
  },
};

/**
 * Default content for the 'firstTurnOnlyBlock' field of a PromptCard.
 * From PromptCardDefaults.kt.
 */
export const DEFAULT_FIRST_TURN_PROMPT_BLOCK: string = `The camera pans down. It's your first time in this place.
Describe the scene and how the world feels from the character's perspective.`;

/**
 * Default content for the 'emitSkeleton' field of a PromptCard.
 * From PromptCardDefaults.kt.
 */
export const DEFAULT_EMIT_SKELETON_STRING: string = `
### Narrator Output Structure

**IMPORTANT:** Your response MUST follow this exact structure. Each section MUST be separated by the specified markers on their own lines.

1.  **Narrative Prose:**
    *   Begin with clear, immersive narration in freeform prose.
    *   This is the only section that should contain descriptive text. It MUST NOT contain any markers or JSON blocks.

2.  **Summary Digest Block (\`@digest\`):**
    *   After the prose, you MUST include a single newline, followed by the marker \`@digest\` on its own line.
    *   Immediately after the marker, provide a \`\`\`json\`\`\` block containing an array of 1-5 summary lines.
    *   Each line MUST have an importance score from 1 (minor) to 5 (critical).

3.  **Emit Block (\`@delta\`):**
    *   After the digest block, include a single newline, followed by the marker \`@delta\` on its own line.
    *   Immediately after the marker, provide a \`\`\`json\`\`\` block containing key-value deltas for the world state.

4.  **Scene Change Block (\`@scene\`, Optional):**
    *   If the scene has shifted, include a single newline, followed by the marker \`@scene\` on its own line.
    *   Immediately after the marker, provide a \`\`\`json\`\`\` block with the new scene object.

---

### **MANDATORY OUTPUT FORMAT EXAMPLE**

This is not optional. Your output must match this structure precisely.

The mist curls like spectral fingers around the ancient oaks. #Lyrielle stands rigid, her silver-threaded cloak shimmering faintly in the moonlight. You feel a sudden chill as #Brom shifts his weight, his leather armor creaking.

@digest
\`\`\`json
[
  { "text": "#Lyrielle appears tense and wary.", "importance": 3 },
  { "text": "The mist in @MoonlitVale thickens, obscuring the path.", "importance": 2 }
]
\`\`\`

@delta
\`\`\`json
{
  "=npcs.#lyrielle.status": "wary",
  "+world.environment.fog_density": 0.1
}
\`\`\`

@scene
\`\`\`json
{
  "location": "@MoonlitVale",
  "present": ["#you", "#lyrielle", "#brom"],
  "weather": "foggy"
}
\`\`\`
---

### Emit & Tagging Rules

*   **Emit Rules:** Paths are \`category.entity.field\`. Use symbolic ops: \`+\`, \`=\`, \`!\`, \`-\`. Paths must be valid.
*   **Tagging Rules:** Use \`#\` for characters, \`@\` for locations, \`$\` for items. Use tags consistently in narration and emits.

`.trim();