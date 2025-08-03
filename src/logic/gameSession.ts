// src/logic/gameSession.ts

import { PromptCard } from '../models/PromptCard';
import { GameSnapshot } from '../models/GameSnapshot';
import { LogEntry } from '../models/LogEntry';
import { GameState, SceneState } from '../models/GameState'; // Import SceneState too
import { Message } from '../models/Message'; // Import Message model
import { DeltaInstruction, DeltaMap } from '../models/DeltaInstruction'; // Import DeltaInstruction and DeltaMap

import { promptBuilder, IPromptBuilder } from './promptBuilder';
import { aiClient, IAiClient } from './aiClient'; // Import AI client
import { logManager, ILogManager } from './logManager'; // Import Log Manager
import { promptCardRepository, IPromptCardRepository } from '../data/repositories/promptCardRepository';
import { gameRepository, IGameRepository } from '../data/repositories/gameRepository'; // Will be created next

/**
 * Interface defining the contract for the Game Session manager.
 * Orchestrates the turn flow, handles player actions, calls AI, updates logs & saves.
 */
export interface IGameSession {
  /**
   * Initializes a new game session or loads an existing one.
   * @param userId The ID of the current user.
   * @param cardId The ID of the PromptCard to use for the game.
   * @param existingSnapshotId Optional ID of an existing game snapshot to load.
   * @returns A Promise resolving with the initialized GameSession instance.
   */
  initializeGame(userId: string, cardId: string, existingSnapshotId?: string): Promise<void>;

  /**
   * Processes a player's action, generates an AI response, and updates the game state.
   * @param action The player's input string.
   * @returns A Promise resolving with the AI's response and any state changes.
   */
  processPlayerAction(action: string): Promise<{ aiProse: string; newLogEntries: LogEntry[]; updatedSnapshot: GameSnapshot }>;

  /**
   * Retrieves the current game state.
   * @returns The current GameSnapshot or null if not initialized.
   */
  getCurrentGameSnapshot(): GameSnapshot | null;

  /**
   * Saves the current game state.
   * @returns A Promise resolving when the game is saved.
   */
  saveGame(): Promise<void>;

  /**
   * Loads a game snapshot.
   * @param snapshotId The ID of the snapshot to load.
   * @returns A Promise resolving when the game is loaded.
   */
  loadGame(snapshotId: string): Promise<void>;

  /**
   * Provides access to the current PromptCard for UI purposes.
   */
  getCurrentPromptCard(): PromptCard | null;

  /**
   * Provides access to the current GameState for UI purposes.
   */
  getCurrentGameState(): GameState | null;

  /**
   * Provides access to the current LogEntries for UI purposes.
   */
  getGameLogs(): LogEntry[];
}

/**
 * Concrete implementation of IGameSession.
 */
export class GameSession implements IGameSession {
  private currentUserId: string | null = null;
  private currentSnapshot: GameSnapshot | null = null;

  constructor(
    private cardRepo: IPromptCardRepository,
    private gameRepo: IGameRepository, // Now injecting gameRepo
    private builder: IPromptBuilder,
    private aiClient: IAiClient, // Now injecting aiClient
    private logManager: ILogManager, // Now injecting logManager
  ) {}

  async initializeGame(userId: string, cardId: string, existingSnapshotId?: string): Promise<void> {
    this.currentUserId = userId;
    const card = await this.cardRepo.getPromptCard(userId, cardId);
    if (!card) {
      throw new Error(`PromptCard with ID ${cardId} not found for user ${userId}. Cannot start game.`);
    }

    if (existingSnapshotId) {
      const snapshot = await this.gameRepo.getGameSnapshot(userId, existingSnapshotId);
      if (!snapshot) {
        throw new Error(`Game snapshot with ID ${existingSnapshotId} not found for user ${userId}.`);
      }
      this.currentSnapshot = snapshot;
      console.log(`Loaded existing game: ${snapshot.id}`);
    } else {
      // Start a new game
      const newSnapshotId = new Date().getTime().toString(); // Simple ID for new snapshot, replace with UUID for robust solution
      const now = new Date().toISOString();

      const initialGameState: GameState = {
        narration: "A new adventure begins...",
        worldState: {}, // Initialize as empty, `worldStateInit` from card will populate this
        scene: { location: null, present: [] }, // Initialize empty scene
      };

      // Apply initial worldState from PromptCard (similar to ViewModel's setActivePromptCard logic)
      if (card.worldStateInit && card.worldStateInit.trim().length > 0) {
        try {
          const parsedInit = JSON.parse(card.worldStateInit);
          // Simple validation: ensure it's a top-level object
          if (typeof parsedInit === 'object' && parsedInit !== null && !Array.isArray(parsedInit)) {
            initialGameState.worldState = parsedInit;
          } else {
            console.warn("PromptCard worldStateInit is not a valid JSON object, ignoring:", card.worldStateInit);
          }
        } catch (e) {
          console.error("Failed to parse PromptCard worldStateInit JSON:", e);
        }
      }

      this.currentSnapshot = {
        id: newSnapshotId,
        userId: userId,
        promptCardId: card.id,
        createdAt: now,
        updatedAt: now,
        currentTurn: 0,
        gameState: initialGameState,
        conversationHistory: [], // Start with empty history
        logs: [],
      };
      console.log(`Initialized new game with card: ${card.title}, Snapshot ID: ${newSnapshotId}`);

      // First turn prompt (for AI)
      const firstTurnPrompt = this.builder.buildFirstTurnPrompt(card);
      console.log("First Turn Prompt (for AI):", firstTurnPrompt);
      // Note: No AI call here. The first actual AI call happens on the first player action.
      // This initial prompt is for building the session's context for the first turn.
    }
  }

  async processPlayerAction(action: string): Promise<{ aiProse: string; newLogEntries: LogEntry[]; updatedSnapshot: GameSnapshot }> {
    if (!this.currentSnapshot || !this.currentUserId || !this.currentSnapshot.promptCardId) {
      throw new Error("Game not initialized. Call initializeGame first.");
    }
    const userId = this.currentUserId;
    const currentSnapshot = this.currentSnapshot;
    const promptCard = await this.cardRepo.getPromptCard(userId, currentSnapshot.promptCardId);

    if (!promptCard) {
      throw new Error(`Active PromptCard with ID ${currentSnapshot.promptCardId} not found.`);
    }

    const nextTurnNumber = currentSnapshot.currentTurn + 1;

    // 1. Build prompt for AI (including dynamic context)
    const messagesToSend: Message[] = this.builder.buildEveryTurnPrompt(
      promptCard,
      currentSnapshot.gameState,
      currentSnapshot.logs,
      currentSnapshot.conversationHistory, // Pass conversation history
      action, // Pass current user action
      nextTurnNumber // Pass current turn number
    );

    const apiRequestBody = JSON.stringify({
        model: promptCard.aiSettings.selectedConnectionId, // Placeholder; actual model slug comes from AiConnection
        messages: messagesToSend.map(m => ({ role: m.role, content: m.content })) // Simplified for logging
    });

    let aiRawOutput: string = "";
    let aiResponseLatencyMs: number | null = null;
    let aiModelSlugUsed: string = "";
    let aiApiUrl: string | null = null;
    let aiApiResponseBody: string | null = null;
    let aiTokenUsage: any = null; // TokenSummary from AI not implemented yet

    try {
        const connection = (await this.gameRepo.getAiConnections(userId)).find(c => c.id === promptCard.aiSettings.selectedConnectionId);
        if (!connection) {
            throw new Error(`AI connection ${promptCard.aiSettings.selectedConnectionId} not found.`);
        }
        aiModelSlugUsed = connection.modelSlug;
        aiApiUrl = new URL("chat/completions", connection.apiUrl).href; // Full URL for logging

        const startTime = performance.now();
        aiRawOutput = await this.aiClient.generateCompletion(
            connection,
            messagesToSend,
            promptCard.aiSettings
        );
        aiResponseLatencyMs = Math.round(performance.now() - startTime);

        // TODO: Extract actual token usage from AI response if available in the future.
        // For now, it's null in LogEntry.

        // Update conversation history with user message
        currentSnapshot.conversationHistory.push({ role: 'user', content: action });

    } catch (e: any) {
        console.error("AI call failed:", e);
        // Fallback or error handling
        aiRawOutput = `AI system error: ${e.message}. Please try again or check settings.`;
        // Update conversation history with assistant error message
        currentSnapshot.conversationHistory.push({ role: 'assistant', content: aiRawOutput });
        throw e; // Re-throw to indicate failure
    }

    // 2. Process AI output with deltaParser
    const parsedAiOutput = this.builder.parseNarratorOutput(aiRawOutput); // PromptBuilder now also contains parsing

    // Update conversation history with AI assistant response
    currentSnapshot.conversationHistory.push({ role: 'assistant', content: parsedAiOutput.prose });


    // 3. Update Game State with deltas (Replicates GameState.applyDeltas)
    const updatedGameState: GameState = { ...currentSnapshot.gameState };
    if (parsedAiOutput.deltas) {
      this.applyDeltasToGameState(updatedGameState, parsedAiOutput.deltas);
    }
    // Update SceneState based on parsed @scene block or deltas (Replicates SceneManager)
    this.updateSceneState(updatedGameState.scene, parsedAiOutput.scene, parsedAiOutput.deltas, updatedGameState.worldState);


    // 4. Create new LogEntry (Replicates TurnLogAssembler & DigestManager.addParsedLines)
    const newLogEntry: LogEntry = this.logManager.assembleTurnLogEntry({
      turnNumber: nextTurnNumber,
      userInput: action,
      rawNarratorOutput: aiRawOutput,
      parsedOutput: parsedAiOutput,
      contextSnapshot: JSON.stringify(messagesToSend), // Stringify the full messages array for context log
      tokenUsage: aiTokenUsage,
      aiSettings: promptCard.aiSettings,
      apiRequestBody: apiRequestBody,
      apiResponseBody: aiApiResponseBody, // Placeholder, actual response body needed from aiClient
      apiUrl: aiApiUrl,
      latencyMs: aiResponseLatencyMs,
      modelSlugUsed: aiModelSlugUsed,
    });
    currentSnapshot.logs.push(newLogEntry);


    // 5. Update snapshot metadata and save
    currentSnapshot.gameState = updatedGameState;
    currentSnapshot.currentTurn = nextTurnNumber;
    currentSnapshot.updatedAt = new Date().toISOString();

    await this.saveGame(); // Save the full snapshot

    return {
      aiProse: parsedAiOutput.prose,
      newLogEntries: [newLogEntry], // Return just the new one for UI, but snapshot has all
      updatedSnapshot: this.currentSnapshot,
    };
  }

  getCurrentGameSnapshot(): GameSnapshot | null {
    return this.currentSnapshot;
  }

  getCurrentPromptCard(): PromptCard | null {
    return this.currentSnapshot ?
        (this.cardRepo.getPromptCard(this.currentUserId!, this.currentSnapshot.promptCardId) || null)
        : null; // Fetch from repo to ensure it's up to date. Or, consider storing card directly in snapshot.
  }

  getCurrentGameState(): GameState | null {
    return this.currentSnapshot ? this.currentSnapshot.gameState : null;
  }

  getGameLogs(): LogEntry[] {
    return this.currentSnapshot ? this.currentSnapshot.logs : [];
  }

  async saveGame(): Promise<void> {
    if (!this.currentUserId || !this.currentSnapshot) {
      console.warn("Cannot save game: user or game snapshot not initialized.");
      return;
    }
    await this.gameRepo.saveGameSnapshot(this.currentUserId, this.currentSnapshot);
    console.log(`Game snapshot ${this.currentSnapshot.id} saved for user ${this.currentUserId}.`);
  }

  async loadGame(snapshotId: string): Promise<void> {
    if (!this.currentUserId) {
      throw new Error("Cannot load game: user not initialized.");
    }
    const snapshot = await this.gameRepo.getGameSnapshot(this.currentUserId, snapshotId);
    if (!snapshot) {
      throw new Error(`Game snapshot ${snapshotId} not found for user ${this.currentUserId}.`);
    }
    this.currentSnapshot = snapshot;
    console.log(`Game snapshot ${snapshotId} loaded.`);
  }

  /**
   * Applies DeltaInstruction objects to the game's worldState.
   * This is a direct translation and simplification of GameState.applyDeltas.
   * Assumes 'player' fields like hp/gold/narration are now part of worldState.
   * This logic now lives here, or could be a private helper in deltaParser if desired.
   */
  private applyDeltasToGameState(gameState: GameState, deltas: DeltaMap): void {
    const updatedWorld = { ...gameState.worldState }; // Create a mutable copy of worldState

    for (const fullKey in deltas) {
      const instruction = deltas[fullKey];
      const parts = instruction.key.split('.'); // instruction.key now holds the path like "player.hp"

      // Traverse or create path
      let currentLevel: Record<string, any> = updatedWorld;
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!currentLevel[part] || typeof currentLevel[part] !== 'object' || Array.isArray(currentLevel[part])) {
          currentLevel[part] = {}; // Create if non-existent or not an object
        }
        currentLevel = currentLevel[part];
      }

      const lastPart = parts[parts.length - 1];

      switch (instruction.op) {
        case 'add':
          // Assuming 'add' is primarily for numbers or arrays
          const prevAddValue = typeof currentLevel[lastPart] === 'number' ? currentLevel[lastPart] : 0;
          const addValue = typeof instruction.value === 'number' ? instruction.value : 0;
          currentLevel[lastPart] = prevAddValue + addValue;
          break;
        case 'assign':
          currentLevel[lastPart] = instruction.value;
          break;
        case 'declare':
          if (!(lastPart in currentLevel)) { // Only declare if not already present
            currentLevel[lastPart] = instruction.value;
          }
          break;
        case 'delete':
          delete currentLevel[lastPart];
          break;
      }
    }
    gameState.worldState = updatedWorld; // Assign the updated worldState back
  }

  /**
   * Updates the SceneState based on parsed AI output or infers from deltas.
   * Replicates logic from SceneManager.
   */
  private updateSceneState(currentScene: SceneState, parsedScene: Record<string, any> | null | undefined, deltas: DeltaMap, worldState: Record<string, any>): void {
    let newLocation: string | null = currentScene.location;
    let newPresent: string[] = currentScene.present;

    // Prioritize explicit @scene block
    if (parsedScene) {
      if (parsedScene.location !== undefined) {
        newLocation = typeof parsedScene.location === 'string' ? parsedScene.location : null;
      }
      if (Array.isArray(parsedScene.present)) {
        newPresent = parsedScene.present.filter((item: any) => typeof item === 'string');
      }
    } else {
      // Fallback: Infer from deltas if scene was not explicitly provided by AI
      // Only infer if current scene is empty or not yet set
      if (!newLocation && newPresent.length === 0 && deltas) {
        const inferredPresent = new Set<string>();
        for (const fullKey in deltas) {
          const instruction = deltas[fullKey];
          if (instruction.op === 'declare') { // Only 'declare' deltas suggest new entities
            const parts = instruction.key.split('.');
            if (parts.length >= 2) {
              const category = parts[0];
              const entity = parts[1];
              // Check if the declared value has a 'tag' property indicative of character/location
              const valueObj = instruction.value as Record<string, any>;
              if (valueObj && (valueObj.tag === 'character' || valueObj.tag === 'location')) {
                inferredPresent.add(`${category}.${entity}`);
              }
            }
            if (instruction.key === "world.location" && typeof instruction.value === 'string') {
              newLocation = instruction.value;
            }
          }
        }
        newPresent = Array.from(inferredPresent);
      }
    }

    currentScene.location = newLocation;
    currentScene.present = newPresent;
  }
}

// Export a singleton instance of the GameSession, injecting all required dependencies.
// We will create `gameRepository` in the next step.
import { gameRepository } from '../data/repositories/gameRepository.ts'; 
export const gameSession = new GameSession(
  promptCardRepository,
  gameRepository,
  // Placeholder for gameRepository. You'll replace this with the actual instance later.
  // This is a common pattern to avoid circular dependencies during initial setup.
  {} as IGameRepository, // TEMP: Placeholder until gameRepository is created
  promptBuilder,
  aiClient,
  logManager
);