// src/logic/aiClient.ts

import { ModelInfo } from '../data/config/aiConnectionTemplates';
import type { Message, AiSettings, AiConnection } from '../models';
/**
 * Interface defining the contract for an AI client.
 */
export interface IAiClient {
  /**
   * Sends a completion request to the AI API.
   * @param connection The AiConnection details (URL, API key).
   * @param messages The array of messages forming the conversation context.
   * @param settings The AI settings for this specific call (temperature, etc.).
   * @returns A Promise that resolves with the raw stringified JSON of the AI's response.
   */
  generateCompletion(
    connection: AiConnection,
    messages: Message[],
    settings: AiSettings
  ): Promise<string>;

  /**
   * Tests an AI connection by making a minimal API call.
   * @param connection The AiConnection details to test.
   * @returns A Promise that resolves to an object with success status and a descriptive message.
   */
  testConnection(connection: AiConnection): Promise<{ success: boolean, message: string }>;

  /**
   * Fetches a list of available models from the provider.
   * @param connection A partial connection object with apiUrl and apiToken.
   * @returns A Promise resolving with an array of ModelInfo objects.
   */
  listModels(connection: Pick<AiConnection, 'apiUrl' | 'apiToken'>): Promise<ModelInfo[]>;
}

/**
 * Concrete implementation of IAiClient using the browser's fetch API.
 */
class AiClient implements IAiClient {
  async generateCompletion(
    connection: AiConnection,
    messages: Message[],
    settings: AiSettings
  ): Promise<string> {
    if (!connection.apiToken || connection.apiToken.includes('PASTE') || connection.apiToken === "MISSING_API_KEY") {
      throw new Error("API key is missing or is a placeholder. Please set it in Settings.");
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
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${connection.apiToken}` },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        let specificError = `Request failed with status ${response.status}.`;
        switch (response.status) {
          case 401: specificError = "Authentication error (401). Your API Key is likely invalid or expired."; break;
          case 403: specificError = "Permission denied (403). Your API key may not have access to this model."; break;
          case 404: specificError = `Model not found (404). Check if the API URL is correct and the model slug '${connection.modelSlug}' is valid.`; break;
          case 429: specificError = "Rate limit exceeded (429). You are sending requests too quickly. Please wait and try again."; break;
          case 500: specificError = "AI Server Error (500). The provider is having issues. Please try again later."; break;
        }
        throw new Error(`${specificError} Details: ${errorBody.substring(0, 200)}...`);
      }

      const responseJson = await response.json();
      return JSON.stringify(responseJson);
    } catch (error: unknown) {
        if (error instanceof Error) {
            throw new Error(`AI API call failed: ${error.message}`);
        }
        throw new Error(`An unknown error occurred during the AI API call.`);
    }
  }

  async testConnection(connection: AiConnection): Promise<{ success: boolean, message: string }> {
    if (!connection.apiToken || connection.apiToken.includes('PASTE') || connection.apiToken === "MISSING_API_KEY") {
      return { success: false, message: "API Key is missing or is a placeholder." };
    }

    const apiUrl = new URL("chat/completions", connection.apiUrl).href;
    const testMessage: Message[] = [{ role: 'user', content: 'hello' }];
    const requestBody = { model: connection.modelSlug, messages: testMessage, max_tokens: 10 };

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${connection.apiToken}` },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        return { success: true, message: `Success! Received response from model.` };
      } else {
        const errorBody = await response.text();
        let specificError = `Request failed with status ${response.status}.`;
        switch (response.status) {
          case 401: specificError = "Authentication error (401). Your API Key is invalid."; break;
          case 404: specificError = `Model not found (404). Check API URL and Model Slug.`; break;
          case 403: specificError = "Permission denied (403). Key may not have access to this model."; break;
          default: specificError = `Error ${response.status}: ${errorBody.substring(0, 100)}`;
        }
        return { success: false, message: `❌ ${specificError}` };
      }
    } catch (error) {
      return { success: false, message: `❌ Network Error: Could not reach the API endpoint. Check the URL and your connection.` };
    }
  }

  async listModels(connection: Pick<AiConnection, 'apiUrl' | 'apiToken'>): Promise<ModelInfo[]> {
    if (!connection.apiToken || connection.apiToken.includes('PASTE')) {
      throw new Error("An API key is required to fetch models.");
    }
    
    const modelsUrl = new URL("models", connection.apiUrl).href;

    try {
      const response = await fetch(modelsUrl, { 
        method: 'GET', 
        headers: { 'Authorization': `Bearer ${connection.apiToken}` }
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch models with status ${response.status}`);
      }
      const json = await response.json();
      
      // The data structure varies between APIs (e.g., json.data for OpenAI)
      const modelList = json.data || json.models || [];

      return modelList
        .map((model: any) => ({ 
          id: model.id, 
          name: model.name || model.id // Use 'name' if available (like OpenRouter), otherwise fall back to 'id'
        }))
        .sort((a: ModelInfo, b: ModelInfo) => a.name.localeCompare(b.name));

    } catch (error) {
      console.error("Failed to list models:", error);
      throw error;
    }
  }
}

// Export a singleton instance of the AI client.
export const aiClient = new AiClient();