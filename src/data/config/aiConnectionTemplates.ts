// src/data/config/aiConnectionTemplates.ts
import type { AiConnection } from '../../models';
export interface ModelInfo {
  id: string; // The API identifier, e.g., "gpt-4-turbo"
  name: string; // The human-readable name, e.g., "GPT-4 Turbo"
  description?: string; // NEW: A description for the tooltip/dialog
}

export interface AiConnectionTemplate extends Omit<AiConnection, 'id' | 'createdAt' | 'lastUpdated'> {
  supportsModelDiscovery: boolean;
  commonModels: ModelInfo[];
}

// Using a Record for easier lookup by key
export const aiConnectionTemplates: Record<string, AiConnectionTemplate> = {
  openai: {
    displayName: 'OpenAI',
    modelName: 'GPT-4o',
    modelSlug: 'gpt-4o',
    apiUrl: 'https://api.openai.com/v1/',
    apiToken: 'PASTE_YOUR_OPENAI_KEY_HERE',
    functionCallingEnabled: true,
    userAgent: 'StoryForge/1.0',
    supportsModelDiscovery: true,
    commonModels: [
      { id: 'gpt-4o', name: 'GPT-4o', description: 'The latest and most advanced model from OpenAI. Excellent reasoning, multimodal capabilities.' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'A powerful and fast version of GPT-4, optimized for performance.' },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'A highly capable and cost-effective model, great for general purpose tasks.' },
    ],
  },
  google: {
    displayName: 'Google',
    modelName: 'Gemini 1.5 Flash',
    modelSlug: 'gemini-1.5-flash-latest',
    apiUrl: 'https://generativelanguage.googleapis.com/v1beta/',
    apiToken: 'PASTE_YOUR_GOOGLE_AI_STUDIO_KEY_HERE',
    functionCallingEnabled: true,
    userAgent: 'StoryForge/1.0',
    supportsModelDiscovery: false, // Google's API needs a different endpoint for model listing
    commonModels: [
      { id: 'gemini-1.5-pro-latest', name: 'Gemini 1.5 Pro', description: 'Google\'s top-tier multimodal model with a massive context window.' },
      { id: 'gemini-1.5-flash-latest', name: 'Gemini 1.5 Flash', description: 'A lightweight, fast, and cost-efficient version of Gemini 1.5.' },
      { id: 'gemini-1.0-pro', name: 'Gemini 1.0 Pro', description: 'The original balanced model for scaled tasks.' },
    ],
  },
  deepseek: {
    displayName: 'DeepSeek',
    modelName: 'DeepSeek Coder V2',
    modelSlug: 'deepseek-coder-v2',
    apiUrl: 'https://api.deepseek.com/v1/',
    apiToken: 'PASTE_YOUR_DEEPSEEK_KEY_HERE',
    functionCallingEnabled: true,
    userAgent: 'StoryForge/1.0',
    supportsModelDiscovery: true,
    commonModels: [
        { id: 'deepseek-chat', name: 'DeepSeek Chat', description: 'Specialized in general conversation and creative text generation.' },
        { id: 'deepseek-coder', name: 'DeepSeek Coder', description: 'Specialized in code generation and explanation. A very capable model.' },
    ],
  },
  openrouter: {
    displayName: 'OpenRouter',
    modelName: 'OpenRouter (Auto)',
    modelSlug: 'openrouter/auto',
    apiUrl: 'https://openrouter.ai/api/v1/',
    apiToken: 'PASTE_YOUR_OPENROUTER_KEY_HERE',
    functionCallingEnabled: true,
    userAgent: 'StoryForge/1.0',
    supportsModelDiscovery: true,
    commonModels: [
        { id: 'openrouter/auto', name: 'Auto (Best)', description: 'OpenRouter automatically selects the best model for your prompt based on price and performance.' },
        { id: 'google/gemini-flash-1.5', name: 'Google: Gemini Flash 1.5', description: 'Fast and affordable model, good for quick tasks.' },
        { id: 'openai/gpt-4o', name: 'OpenAI: GPT-4o', description: 'Access GPT-4o through OpenRouter\'s API.' },
        { id: 'mistralai/mistral-large', name: 'Mistral Large', description: 'High-quality model from Mistral AI, strong reasoning.' },
    ],
  },
  custom: {
    displayName: 'Custom',
    modelName: 'Custom Model',
    modelSlug: '',
    apiUrl: '',
    apiToken: '',
    functionCallingEnabled: false,
    userAgent: 'StoryForge/1.0',
    supportsModelDiscovery: false,
    commonModels: [],
  },
};