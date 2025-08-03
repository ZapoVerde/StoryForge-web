// src/models/AiConnection.ts

/**
 * Represents the configuration for a connection to an AI service.
 */
export interface AiConnection {
  id: string; // e.g., "deepseek-coder"
  modelName: string; // e.g., "DeepSeek Coder"
  modelSlug: string; // e.g., "deepseek-coder"
  apiUrl: string; // e.g., "https://api.deepseek.com/v1/"
  apiToken: string; // The user's API key
}