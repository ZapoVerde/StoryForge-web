// src/utils/uuid.ts

import { v4 as uuidv4 } from 'uuid';

/**
 * Generates a new unique UUID (Universally Unique Identifier).
 * @returns A string representation of a UUID v4.
 */
export function generateUuid(): string {
  return uuidv4();
}