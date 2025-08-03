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
   * @returns A Promise that resolves with the raw text content of the AI's response (or stringified JSON if full response).
   */
  generateCompletion(
    connection: AiConnection,
    messages: Message[],
    settings: AiSettings
  ): Promise<string>; // Changed return type to string to hold raw JSON or content

  /**
   * Tests an AI connection by making a minimal API call.
   * @param connection The AiConnection details to test.
   * @returns A Promise that resolves to true if the connection is successful, false otherwise.
   */
  testConnection(connection: AiConnection): Promise<boolean>;
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
  ): Promise<string> { // Now returns raw string, expecting JSON from most APIs
    if (!connection.apiToken || connection.apiToken === "YOUR_DEEPSEEK_API_KEY_HERE" || connection.apiToken === "MISSING_API_KEY") {
      throw new Error("AI API key is missing or not configured. Please set it in Settings.");
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
      stream: false, // For now, we're not streaming
    };

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${connection.apiToken}`,
          // User-Agent if provided
          ...(connection.userAgent && { 'User-Agent': connection.userAgent }),
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error("AI API Error Response:", errorBody);
        throw new Error(`AI API request failed with status ${response.status}: ${response.statusText}. Details: ${errorBody.substring(0, 200)}...`);
      }

      const responseJson = await response.json();
      // Return the full stringified JSON response for gameSession to parse token usage etc.
      return JSON.stringify(responseJson);
    } catch (error: unknown) {
        let errorMessage = "An unknown error occurred";
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        console.error("Failed to make AI API call:", error);
        throw new Error(`Network error or AI API failure: ${errorMessage}`);
    }
  }

  async testConnection(connection: AiConnection): Promise<boolean> {
    if (!connection.apiToken || connection.apiToken === "YOUR_DEEPSEEK_API_KEY_HERE" || connection.apiToken === "MISSING_API_KEY") {
      return false; // Cannot test without a valid key
    }

    const apiUrl = new URL("chat/completions", connection.apiUrl).href;
    const testMessage: Message[] = [{ role: 'user', content: 'hello' }];

    const requestBody = {
      model: connection.modelSlug,
      messages: testMessage,
      max_tokens: 10, // Smallest possible request
      temperature: 0.1,
    };

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${connection.apiToken}`,
          ...(connection.userAgent && { 'User-Agent': connection.userAgent }),
        },
        body: JSON.stringify(requestBody),
      });

      // A 2xx status code indicates success, even if the response content is minimal
      if (response.ok) {
        const responseJson = await response.json();
        // Optionally, check for expected content in the response.
        // For a basic test, just success status is enough.
        console.log("AI Connection Test Success:", responseJson);
        return true;
      } else {
        const errorBody = await response.text();
        console.warn(`AI Connection Test Failed (Status: ${response.status}):`, errorBody);
        return false;
      }
    } catch (error) {
      console.error("AI Connection Test Network Error:", error);
      return false;
    }
  }
}

// Export a singleton instance of the AI client.
export const aiClient = new AiClient();