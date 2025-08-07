// src/logic/ContextStackAssembler.ts
import type {
  PromptCard,
  GameState,
  LogEntry,
  Message,
  SceneState,
  StackMode,
  FilterMode,
  DigestLine,
} from '../models';
import { IContextStackAssembler } from './IContextStackAssembler';
import { getNestedValue } from '../utils/jsonUtils'; // Assuming you have this utility function

export class ContextStackAssembler implements IContextStackAssembler {
  public assembleContext(card: PromptCard, gameState: GameState, logEntries: LogEntry[]): Message[] {
    const messages: Message[] = [];
    const { stackInstructions } = card;

    // 1. World State Context
    if (stackInstructions.worldStatePolicy.enabled) {
      messages.push({ role: "system", content: `## Current World State\n\`\`\`json\n${JSON.stringify(gameState.worldState, null, 2)}\n\`\`\`` });
    }

    // 2. Known Entities
    if (stackInstructions.knownEntitiesPolicy.enabled) {
      const knownEntities = this.extractKnownEntities(gameState, stackInstructions.knownEntitiesPolicy.n);
      if (knownEntities.length > 0) {
        messages.push({ role: "system", content: `## Known Entities\n${knownEntities.join('\n')}` });
      }
    }

    // 3. Digest Context
    if (stackInstructions.digestPolicy.enabled) {
      const relevantDigests = this.getRelevantDigests(logEntries, gameState, card.stackInstructions);
      if (relevantDigests.length > 0) {
        messages.push({ role: "system", content: `## Game Summary Digest\n${relevantDigests.map(d => d.text).join('\n')}` });
      }
    }

    // 4. Expression Log
    if (stackInstructions.expressionLogPolicy.enabled) {
      // Placeholder for complex expression logic
    }

    return messages;
  }
  
  private getSceneTags(scene: SceneState, worldState: Record<string, any>): string[] {
    const tags = new Set<string>();
    if (scene.location?.startsWith('@')) tags.add(scene.location);
    scene.present.forEach(path => {
      const entity = getNestedValue(worldState, path.split('.'));
      if (entity?.tag) tags.add(entity.tag);
    });
    return Array.from(tags);
  }

  private extractKnownEntities(gameState: GameState, limit: number): string[] {
    const entities = new Set(this.getSceneTags(gameState.scene, gameState.worldState));
    return Array.from(entities).slice(0, limit);
  }

  private getRelevantDigests(logs: LogEntry[], gameState: GameState, instructions: PromptCard['stackInstructions']): DigestLine[] {
    const relevantDigests: DigestLine[] = [];
    const sceneTags = this.getSceneTags(gameState.scene, gameState.worldState);
    for (const log of logs) {
      for (const digest of log.digestLines) {
        const rule = instructions.digestEmission[digest.importance];
        if (!rule || rule.mode === StackMode.NEVER) continue;
        const meetsCondition = (rule.mode === StackMode.ALWAYS) || (rule.mode === StackMode.FIRST_N && log.turnNumber <= rule.n) || (rule.mode === StackMode.AFTER_N && log.turnNumber >= rule.n);
        if (meetsCondition) {
          let include = true;
          if (instructions.digestPolicy.filtering === FilterMode.SCENE_ONLY) include = digest.tags?.some(tag => sceneTags.includes(tag)) ?? false;
          else if (instructions.digestPolicy.filtering === FilterMode.TAGGED) include = (digest.tags?.length ?? 0) > 0;
          if (include) relevantDigests.push(digest);
        }
      }
    }
    return relevantDigests;
  }
}