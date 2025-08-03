// src/models/Message.ts

/**
 * Represents a single message in a conversation with the AI.
 * Corresponds to Message.kt.
 */
export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}