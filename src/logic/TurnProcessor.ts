// src/logic/TurnProcessor.ts

import { AiConnection, GameState, LogEntry, Message, ParsedNarrationOutput, PromptCard, TokenSummary } from '../models';
import { AiSettings } from '../models/PromptCard';
import { IAiClient } from './aiClient';
import { parseNarratorOutput } from './deltaParser';
import { ILogManager } from './logManager';
import { IPromptBuilder } from './promptBuilder';
import { ITurnProcessor } from './ITurnProcessor';


// Define a simple DummyAiClient for testing and dev
class DummyAiClient implements IAiClient {
  async generateCompletion(
    connection: AiConnection,
    messages: Message[],
    settings: AiSettings
  ): Promise<string> {
    console.log("Dummy Narrator: Simulating AI response...");
    const lastUserMessage = messages.find(m => m.role === 'user')?.content || 'No user input.';
    const dummyResponse = {
      choices: [{
        message: {
          content: `The dummy narrator responds to your action: "${lastUserMessage}". A gentle breeze rustles through the imaginary trees.

@digest
\`\`\`json
[
  { "text": "A dummy event occurred.", "importance": 3 },
  { "text": "Your input was: '${lastUserMessage}'.", "importance": 1 }
]
\`\`\`

@delta
\`\`\`json
{
  "=player.hp": 99,
  "+player.gold": 1
}
\`\`\`

@scene
\`\`\`json
{
  "location": "dummy_location",
  "present": ["#you"]
}
\`\`\`
`
        }
      }],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 50,
        total_tokens: 60,
      }
    };
    return Promise.resolve(JSON.stringify(dummyResponse)); // Return as stringified JSON
  }

  async testConnection(connection: AiConnection): Promise<boolean> {
    return Promise.resolve(true); // Dummy always passes test
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
      turnNumber
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