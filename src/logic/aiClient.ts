// src/logic/aiClient.ts

import type { Message } from '../models/Message';
import type { AiSettings } from '../models/PromptCard';
import type { AiConnection } from '../models/AiConnection';

/**
 * Interface defining the contract for an AI client.
 */
export interface IAiClient {
  /**
   * Sends a completion request to the AI API.
   * @param connection The AiConnection details (URL, API key).
   * @param messages The array of messages forming the conversation context.
   * @param settings The AI settings for this specific call (temperature, etc.).
   * @returns A Promise that resolves with the raw text content of the AI's response.
   */
  generateCompletion(
    connection: AiConnection,
    messages: Message[],
    settings: AiSettings
  ): Promise<string>;
}

/**
 * Concrete implementation of IAiClient using the browser's fetch API.
 * This directly replaces the Retrofit/OkHttp logic from AINarrator.kt.
 */
class AiClient implements IAiClient {
  async generateCompletion(
    connection: AiConnection,
    messages: Message[],
    settings: AiSettings
  ): Promise<string> {
    if (!connection.apiToken || connection.apiToken === "MISSING_API_KEY") {
      throw new Error("AI API key is missing or not configured.");
    }

    const apiUrl = new URL("chat/completions", connection.apiUrl).href;

    const requestBody = {
      model: connection.modelSlug,
      messages: messages,
      temperature: settings.temperature,
      top_p: settings.topP,
      max_tokens: settings.maxTokens,
      presence_penalty: settings.presencePenalty,
      frequency_penalty: settings.frequencyPenalty,
      stream: false,
    };

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${connection.apiToken}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error("AI API Error Response:", errorBody);
        throw new Error(`AI API request failed with status ${response.status}: ${response.statusText}`);
      }

      const responseJson = await response.json();
      const content = responseJson.choices?.[0]?.message?.content?.trim();

      if (!content) {
        console.error("Malformed AI response:", responseJson);
        throw new Error("Received an empty or malformed response from the AI API.");
      }

      return content;
    } catch (error: unknown) {
        let errorMessage = "An unknown error occurred";
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        console.error("Failed to make AI API call:", error);
        throw new Error(`Network error or AI API failure: ${errorMessage}`);
    }
  }
}

// Export a singleton instance of the AI client.
export const aiClient = new AiClient();