// src/logic/IContextStackAssembler.ts
import { PromptCard, GameState, LogEntry, Message } from '../models';

/**
 * Defines the contract for a service that assembles the dynamic parts
 * of an AI prompt's context based on StackInstructions.
 */
export interface IContextStackAssembler {
  /**
   * Assembles the full dynamic context stack based on the rules in the prompt card.
   * @param card The active PromptCard containing the StackInstructions.
   * @param gameState The current GameState.
   * @param logEntries The history of log entries for the session.
   * @returns An array of Message objects representing the assembled context.
   */
  assembleContext(
    card: PromptCard,
    gameState: GameState,
    logEntries: LogEntry[]
  ): Message[];
}```

#### **New File: `src/logic/ContextStackAssembler.ts`**
```typescript
// src/logic/ContextStackAssembler.ts
import {
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

export class ContextStackAssembler implements IContextStackAssembler {
  public assembleContext(
    card: PromptCard,
    gameState: GameState,
    logEntries: LogEntry[]
  ): Message[] {
    const messages: Message[] = [];
    const { stackInstructions } = card;

    // 1. World State Context
    if (stackInstructions.worldStatePolicy.enabled) {
      const worldStateJson = JSON.stringify(gameState.worldState, null, 2);
      messages.push({ role: "system", content: `## Current World State\n\`\`\`json\n${worldStateJson}\n\`\`\`` });
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
      const relevantDigests = this.getRelevantDigests(logEntries, gameState, stackInstructions);
      if (relevantDigests.length > 0) {
        messages.push({ role: "system", content: `## Game Summary Digest\n${relevantDigests.map(d => d.text).join('\n')}` });
      }
    }

    // 4. Expression Log
    if (stackInstructions.expressionLogPolicy.enabled) {
      const expressionContent = this.getExpressionLogContent(logEntries, gameState, stackInstructions);
      if (expressionContent.length > 0) {
        messages.push({ role: "system", content: `## Character Expressions Log\n${expressionContent.join('\n')}` });
      }
    }

    return messages;
  }
  
  private getSceneTags(scene: SceneState, worldState: Record<string, any>): string[] {
    const tags = new Set<string>();
    if (scene.location && scene.location.startsWith('@')) {
      tags.add(scene.location);
    }
    scene.present.forEach(path => {
      const entity = this.getNestedValue(worldState, path.split('.'));
      if (entity?.tag) {
        tags.add(entity.tag);
      }
    });
    return Array.from(tags);
  }

  private getNestedValue(obj: Record<string, any>, pathParts: string[]): any {
    return pathParts.reduce((acc, part) => acc && acc[part], obj);
  }
  
  private extractTags(text: string): string[] {
    return text.match(/[#@$][a-zA-Z0-9_]+/g) || [];
  }

  private extractKnownEntities(gameState: GameState, limit: number): string[] {
    // A simplified entity extraction logic. Can be enhanced.
    const entities = new Set<string>();
    const sceneTags = this.getSceneTags(gameState.scene, gameState.worldState);
    sceneTags.forEach(tag => entities.add(tag));
    
    // Fallback: get some from world state if scene is empty
    if (entities.size === 0) {
        for (const category in gameState.worldState) {
            for (const entityKey in gameState.worldState[category]) {
                if (entityKey.startsWith('#') || entityKey.startsWith('@') || entityKey.startsWith('$')) {
                    entities.add(entityKey);
                    if (entities.size >= limit) break;
                }
            }
            if (entities.size >= limit) break;
        }
    }
    
    return Array.from(entities);
  }

  private getRelevantDigests(logs: LogEntry[], gameState: GameState, instructions: PromptCard['stackInstructions']): DigestLine[] {
    const relevantDigests: DigestLine[] = [];
    const sceneTags = this.getSceneTags(gameState.scene, gameState.worldState);

    for (const log of logs) {
      for (const digest of log.digestLines) {
        const rule = instructions.digestEmission[digest.importance];
        if (!rule || rule.mode === StackMode.NEVER) continue;

        const meetsCondition =
          (rule.mode === StackMode.ALWAYS) ||
          (rule.mode === StackMode.FIRST_N && log.turnNumber <= rule.n) ||
          (rule.mode === StackMode.AFTER_N && log.turnNumber >= rule.n);

        if (meetsCondition) {
          let include = true;
          if (instructions.digestPolicy.filtering === FilterMode.SCENE_ONLY) {
            include = digest.tags?.some(tag => sceneTags.includes(tag)) ?? false;
          } else if (instructions.digestPolicy.filtering === FilterMode.TAGGED) {
            include = (digest.tags?.length ?? 0) > 0;
          }
          if (include) {
            relevantDigests.push(digest);
          }
        }
      }
    }
    return relevantDigests.sort((a, b) => (a as any).turn - (b as any).turn); // `turn` might not be on DigestLine model
  }
  
  private getExpressionLogContent(logs: LogEntry[], gameState: GameState, instructions: PromptCard['stackInstructions']): string[] {
      // This is a placeholder for the complex expression log logic.
      // A full implementation would filter logs based on policy and extract relevant lines.
      return [];
  }
}