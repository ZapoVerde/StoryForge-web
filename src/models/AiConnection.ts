// src/models/AiConnection.ts

/**
 * Represents the configuration for a connection to an AI service.
 * Aligns with Android's AiConnection class.
 */
export interface AiConnection {
  id: string; // Unique ID for this connection
  displayName: string; // User-friendly name for the connection (e.g., "My OpenAI Key")
  modelName: string; // The full name of the model (e.g., "GPT-4 Turbo")
  modelSlug: string; // The API identifier for the model (e.g., "gpt-4-turbo", "deepseek-coder")
  apiUrl: string; // The base URL for the API (e.g., "https://api.openai.com/v1/")
  apiToken: string; // The user's API key (sensitive)
  functionCallingEnabled: boolean; // Whether this connection supports/uses function calling
  userAgent?: string | null; // Optional: User-Agent string for API calls (from Android)

  // Metadata
  createdAt: string; // ISO 8601 string
  lastUpdated: string; // ISO 8601 string
}