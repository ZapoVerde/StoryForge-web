// src/utils/jsonUtils.ts

import { JsonPrimitive } from '@mui/material'; // Assuming this is for example, JsonPrimitive isn't from MUI

/**
 * Flattens a nested JSON object into a single-level map with dot-separated keys.
 * @param obj The JSON object to flatten.
 * @param prefix The prefix for the current level (used in recursion).
 * @returns A map where keys are dot-separated paths and values are primitives or arrays/objects at the leaf.
 */
export function flattenJsonObject(obj: Record<string, any>, prefix: string = ""): Record<string, any> {
  const result: Record<string, any> = {};

  for (const k in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, k)) {
      const fullKey = prefix ? `${prefix}.${k}` : k;
      const value = obj[k];

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        Object.assign(result, flattenJsonObject(value, fullKey));
      } else {
        result[fullKey] = value;
      }
    }
  }
  return result;
}

/**
 * Attempts to parse a string into a JSON primitive (string, number, boolean, null).
 * This is a simplified version of the Android `parseJsonPrimitive` and may need robustness.
 * @param text The string to parse.
 * @returns The parsed JSON primitive or the original string if no better match.
 */
export function parseJsonPrimitive(text: string): any {
  const trimmed = text.trim();

  if (trimmed.toLowerCase() === 'true') return true;
  if (trimmed.toLowerCase() === 'false') return false;
  if (trimmed === 'null') return null;

  const num = Number(trimmed);
  if (!isNaN(num) && isFinite(num)) {
    return num;
  }

  // If it's a string that looks like a string (quoted), remove quotes
  if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) {
    return trimmed.substring(1, trimmed.length - 1);
  }

  // Fallback: if string doesn't parse cleanly, treat as raw string
  return trimmed;
}

/**
 * Safely retrieves a nested value from an object using a dot-separated path.
 * @param obj The object to traverse.
 * @param pathParts An array of strings representing the path.
 * @returns The value at the specified path, or undefined if not found.
 */
export function getNestedValue(obj: Record<string, any>, pathParts: string[]): any {
  let current: any = obj;
  for (const part of pathParts) {
    if (typeof current !== 'object' || current === null || !(part in current)) {
      return undefined;
    }
    current = current[part];
  }
  return current;
}