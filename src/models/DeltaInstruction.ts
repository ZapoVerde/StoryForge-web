// src/models/DeltaInstruction.ts

/**
 * Represents a single instruction to modify the game world state, as per DeltaInstruction.kt.
 * This is a pure data definition, without logic or companion methods.
 * Corresponds to a discriminated union in TypeScript for Kotlin's sealed class.
 *
 * `value: any` corresponds to Kotlin's `JsonElement`, allowing any valid JSON value (string, number, boolean, object, array, null).
 */

export type DeltaInstruction =
  | { op: 'add'; key: string; value: any }      // Corresponds to Add data class
  | { op: 'assign'; key: string; value: any }   // Corresponds to Assign data class
  | { op: 'declare'; key: string; value: any }  // Corresponds to Declare data class
  | { op: 'delete'; key: string };              // Corresponds to Delete data class (no value)

// Helper type for the map of deltas
export type DeltaMap = { [fullKey: string]: DeltaInstruction };