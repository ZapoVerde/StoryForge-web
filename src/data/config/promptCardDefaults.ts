// src/data/promptCardDefaults.ts

// In src/data/config/promptCardDefaults.ts
import { AiSettingsInCard } from '../models/PromptCard'; // AiSettingsInCard is defined in PromptCard.ts
import { StackInstructions } from '../models/StackInstructions'; // StackInstructions is defined in StackInstructions.ts

/**
 * Default AI settings to be used for PromptCards if not specified.
 * Corresponds to AiSettings.kt's default values, now embedded in PromptCard.
 */
export const defaultAiSettingsInCard: AiSettingsInCard = {
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
  narratorProseEmission: { mode: "firstN", n: 3, filtering: "sceneOnly" },
  digestPolicy: { filtering: "tagged" },
  digestEmission: {
    "5": { mode: "always" },
    "4": { mode: "afterN", n: 1 },
    "3": { mode: "firstN", n: 6 },
    "2": { mode: "firstN", n: 3 },
    "1": { mode: "never" },
  },
  expressionLogPolicy: { mode: "always", filtering: "sceneOnly" },
  expressionLinesPerCharacter: 3,
  emotionWeighting: true,
  worldStatePolicy: { mode: "filtered", filtering: "sceneOnly" },
  knownEntitiesPolicy: { mode: "firstN", n: 2, filtering: "tagged" },
  outputFormat: "prose_digest_emit",
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
### Narrator Output Sequence – Goal and Structure

Each narrator response must include the following, in strict order:

1. **Narrative Response (Prose)**
   - Clear, immersive, character-appropriate narration in freeform prose.
   - Describe what the player sees, hears, or experiences without referencing the rules or system.

2. **Summary Digest Block**
   - 1 to 5 short lines summarizing key actions or changes from the prose.
   - Each line must include an importance score from 1 (minor) to 5 (critical).

3. **Emit Block** (if applicable)
   - A JSON object containing key-value deltas for the world state.
   - Must use symbolic prefixes for clarity and internal parsing.

4. **Scene Change Block** (only if the scene has shifted)
   - Provide a new \`scene\` object with updated location, present entities, and any new ambient data.

---

### Narrator Rules – Purpose and Usage

These rules define how the narrator outputs structured state updates, tags, and contextual summaries. They support memory continuity, event parsing, and interaction tracking.

- Emit rules ensure the narrator can update world state cleanly using symbolic paths.
- Tagging rules define which entities are narratively relevant and how they are referenced.
- Scene rules control location shifts and determine who is present in each scene.
- Summary rules ensure that each narration is followed by concise, scored digest lines.

These rules should be included in the narrator’s system prompt or injected as guidance to ensure consistent memory and world interaction.

---

### Emit Rules

- All state paths follow \`category.entity.field\` structure
- Only symbolic-prefixed operations are allowed:
  - \`+\` → Add
  - \`=\` → Assign
  - \`!\` → Declare
  - \`-\` → Delete
- Do not declare new fields unless explicitly permitted
- All emit paths must resolve to valid world_state keys

Example:
{
  "+npcs.#fox.trust": 1,
  "=npcs.goblin_1.hp": 0,
  "=player.#you.weapons.primary.arrows": 47
}

---

### Tagging Rules

- Use symbolic prefixes only on entities worthy of tracking:
  - \`#\` for characters or NPCs
  - \`@\` for locations
  - \`$\` for items that require memory or recurrence
  - \`!\`, \`%\`, \`^\` are reserved for future use
- Tags must only appear on entities at level 2 of world_state (e.g. \`npcs.#fox\`)
- Tags must be used consistently in narration and emit paths
- Do not reference untagged entities with a symbolic prefix

---

### Scene Rules

- A \`scene\` block must always include:
  - \`location\`: either a canonical \`@tag\` or a freeform label
  - \`present\`: a list of all characters (tagged or untagged) in the scene
  - Optional ambient fields: \`season\`, \`weather\`, \`timeOfDay\`
- Only change the scene when narrative focus shifts
- If the location is a tagged entity, it must resolve to \`world_state.locations\`

Example:
"scene": {
  "location": "Between @deepwood and @whiteriver",
  "present": ["#you", "#fox"],
  "weather": "fog",
  "season": "spring",
  "timeOfDay": "dawn"
}

---

### Summary Rules

- After each narration block, emit 1–5 digest lines
- Each line must have an importance score from 1 (minor) to 5 (critical)
- Summaries must be brief, narratively meaningful, and reflect what just occurred

Example:
{ "text": "#fox threatens the goblins.", "importance": 4 }
{ "text": "The fog thickens around @clearing.", "importance": 2 }

- Digest lines must follow narration output — never precede it
`.trim();