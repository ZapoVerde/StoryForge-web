// src/logic/TurnProcessor.ts

import type { AiSettings, AiConnection, GameState, LogEntry, Message, ParsedNarrationOutput, PromptCard, TokenSummary } from '../models';
import type { IAiClient } from './aiClient';
import { parseNarratorOutput } from './deltaParser';
import type { ILogManager } from './logManager';
import type { IPromptBuilder } from './promptBuilder';
import type { ITurnProcessor } from './ITurnProcessor';
import type { ModelInfo } from '../data/config/aiConnectionTemplates';

// Define a simple DummyAiClient for testing and dev
class DummyAiClient implements IAiClient {
  async generateCompletion(
    connection: AiConnection,
    messages: Message[],
    settings: AiSettings
  ): Promise<string> {
    console.log("Dummy Narrator: Simulating AI response...");
    // Find the LAST message with role 'user'
    const lastUserMessage = messages.slice().reverse().find(m => m.role === 'user')?.content || 'No user input.';
    const dummyResponse = {
      choices: [{
        message: {
          // MODIFIED: Dummy response to test all emits and match the expected structure with fences
          content: `The dummy narrator observes your action: "${lastUserMessage}". A ripple of arcane energy flows through the air, subtly shifting the very fabric of reality around you. You hear a distant chime, and a curious, ancient tome appears at your feet.

@digest
\`\`\`json
[
  { "text": "The world reacted to your input: '${lastUserMessage}'.", "importance": 2 },
  { "text": "Something new has manifested nearby: the $enchanted_quill.", "importance": 4, "tags": ["$enchanted_quill"] },
  { "text": "#Brom's disposition shifted slightly.", "importance": 3, "tags": ["#brom"] },
  { "text": "A critical system event occurred, requiring your attention!", "importance": 5 }
]
\`\`\`

@delta
\`\`\`json
{
  "=player.hp": 85,
  "+player.gold": 5,
  "!items.$enchanted_quill.description": "A quill that seems to hum with forgotten magic, vibrating faintly.",
  "-npcs.#old_sage.wisdom" : true,
  "=player.status": "observant"
}
\`\`\`

@scene
\`\`\`json
{
  "location": "@forest_clearing",
  "present": ["#you", "#lyrielle", "$enchanted_quill"],
  "weather": "clear and crisp"
}
\`\`\`
`
        }
      }],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 150, // Increased for a longer response
        total_tokens: 160,
      }
    };
    return Promise.resolve(JSON.stringify(dummyResponse)); // Return as stringified JSON
  }

  async testConnection(connection: AiConnection): Promise<{ success: boolean; message: string }> {
    return Promise.resolve({
      success: true,
      message: "Dummy client: test always passes."
    });
  }
  
  async listModels(connection: Pick<AiConnection, 'apiUrl' | 'apiToken'>): Promise<ModelInfo[]> {
    return Promise.resolve([
      { id: 'dummy-model', name: 'Dummy Model' }
    ]);
  }
  
}


export class TurnProcessor implements ITurnProcessor {
  private realAiClient: IAiClient;
  private dummyAiClient: IAiClient;
  private builder: IPromptBuilder;
  private logManager: ILogManager;

  constructor(
    aiClient: IAiClient,
    promptBuilder: IPromptBuilder,
    logManager: ILogManager
  ) {
    this.realAiClient = aiClient;
    this.builder = promptBuilder;
    this.logManager = logManager;
    this.dummyAiClient = new DummyAiClient();
  }

  private async executeAiCall(
    connection: AiConnection,
    messages: Message[],
    settings: AiSettings,
    useDummyNarrator: boolean
  ): Promise<{ aiRawOutput: string; tokenUsage: TokenSummary | null; fullResponse: string }> {
    const activeClient = useDummyNarrator ? this.dummyAiClient : this.realAiClient;
    const fullResponse = await activeClient.generateCompletion(connection, messages, settings);

    let aiRawOutput = '';
    let tokenUsage: TokenSummary | null = null;
    try {
      const parsedJson = JSON.parse(fullResponse);
      aiRawOutput = parsedJson.choices?.[0]?.message?.content?.trim() || fullResponse;
      tokenUsage = parsedJson.usage ? {
        inputTokens: parsedJson.usage.prompt_tokens || 0,
        outputTokens: parsedJson.usage.completion_tokens || 0,
        totalTokens: parsedJson.usage.total_tokens || 0,
      } : null;
    } catch (e) {
      aiRawOutput = fullResponse;
    }
    return { aiRawOutput, tokenUsage, fullResponse };
  }

  async processFirstTurnNarratorResponse(
    userId: string,
    card: PromptCard,
    initialGameState: GameState,
    useDummyNarrator: boolean,
    aiConnections: AiConnection[]
  ): Promise<{ parsedOutput: ParsedNarrationOutput; logEntry: LogEntry; aiRawOutput: string; tokenUsage: TokenSummary | null; }> {
    const messagesToSend = this.builder.buildFirstTurnPrompt(card);
    const contextSnapshotForLog = JSON.stringify(messagesToSend, null, 2);
    const userInputForLog = card.firstTurnOnlyBlock || "Begin the story.";

    const connection = aiConnections.find(c => c.id === card.aiSettings.selectedConnectionId);
    if (!connection && !useDummyNarrator) {
      throw new Error(`AI connection ${card.aiSettings.selectedConnectionId} not found.`);
    }

    const startTime = performance.now();
    const { aiRawOutput, tokenUsage, fullResponse } = await this.executeAiCall(connection!, messagesToSend, card.aiSettings, useDummyNarrator);
    const latencyMs = Math.round(performance.now() - startTime);

    const parsedOutput = parseNarratorOutput(aiRawOutput);

    const logEntry = this.logManager.assembleTurnLogEntry({
      turnNumber: 0,
      userInput: userInputForLog,
      rawNarratorOutput: aiRawOutput,
      parsedOutput: parsedOutput,
      contextSnapshot: contextSnapshotForLog,
      tokenUsage: tokenUsage,
      aiSettings: card.aiSettings,
      apiRequestBody: JSON.stringify({ model: connection?.modelSlug, messages: "..." }, null, 2),
      apiResponseBody: fullResponse,
      apiUrl: connection ? new URL("chat/completions", connection.apiUrl).href : 'dummy-url',
      latencyMs: latencyMs,
      modelSlugUsed: connection?.modelSlug || 'dummy-model',
    });

    return { parsedOutput, logEntry, aiRawOutput, tokenUsage };
  }

  async processPlayerTurn(
    userId: string,
    card: PromptCard,
    currentGameState: GameState,
    logs: LogEntry[],
    conversationHistory: Message[],
    action: string,
    turnNumber: number,
    useDummyNarrator: boolean,
    aiConnections: AiConnection[]
  ): Promise<{ parsedOutput: ParsedNarrationOutput; logEntry: LogEntry; aiRawOutput: string; tokenUsage: TokenSummary | null; }> {
    const messagesToSend = this.builder.buildEveryTurnPrompt(
      card,
      currentGameState,
      logs,
      conversationHistory,
      action,
    );
    const contextSnapshotForLog = JSON.stringify(messagesToSend, null, 2);

    const connection = aiConnections.find(c => c.id === card.aiSettings.selectedConnectionId);
    if (!connection && !useDummyNarrator) {
      throw new Error(`AI connection ${card.aiSettings.selectedConnectionId} not found.`);
    }

    const startTime = performance.now();
    const { aiRawOutput, tokenUsage, fullResponse } = await this.executeAiCall(connection!, messagesToSend, card.aiSettings, useDummyNarrator);
    const latencyMs = Math.round(performance.now() - startTime);

    const parsedOutput = parseNarratorOutput(aiRawOutput);

    const logEntry = this.logManager.assembleTurnLogEntry({
      turnNumber: turnNumber,
      userInput: action,
      rawNarratorOutput: aiRawOutput,
      parsedOutput: parsedOutput,
      contextSnapshot: contextSnapshotForLog,
      tokenUsage: tokenUsage,
      aiSettings: card.aiSettings,
      apiRequestBody: JSON.stringify({ model: connection?.modelSlug, messages: "..." }, null, 2),
      apiResponseBody: fullResponse,
      apiUrl: connection ? new URL("chat/completions", connection.apiUrl).href : 'dummy-url',
      latencyMs: latencyMs,
      modelSlugUsed: connection?.modelSlug || 'dummy-model',
    });

    return { parsedOutput, logEntry, aiRawOutput, tokenUsage };
  }
}