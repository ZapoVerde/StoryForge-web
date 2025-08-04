// src/logic/gameSession.ts

// Updated import paths for interfaces as well for clarity.
import { PromptCard } from '../models/PromptCard';
import { GameSnapshot } from '../models/GameSnapshot';
import { LogEntry } from '../models/LogEntry';
import { GameState, SceneState } from '../models/GameState';
import { Message } from '../models/Message';
import { DeltaInstruction, DeltaMap } from '../models/DeltaInstruction';
import { AiSettings } from '../models/PromptCard'; // For DummyAiClient
import { AiConnection } from '../models/AiConnection'; // For DummyAiClient

import { IPromptBuilder } from './promptBuilder';
import { IAiClient } from './aiClient';
import { ILogManager } from './logManager';
import { IPromptCardRepository } from '../data/repositories/promptCardRepository';
import { IGameRepository } from '../data/repositories/gameRepository';
import { generateUuid } from '../utils/uuid'; // Import generateUuid

// Define a simple DummyAiClient for testing and dev
class DummyAiClient implements IAiClient {
  async generateCompletion(
    connection: AiConnection,
    messages: Message[],
    settings: AiSettings
  ): Promise<string> {
    console.log("Dummy Narrator: Simulating AI response...");
    const lastUserMessage = messages.find(m => m.role === 'user')?.content || 'No user input.';
    const dummyResponse = {
      choices: [{
        message: {
          content: `@delta\n{"=player.hp": 99, "+player.gold": 1}\n@digest\n{"text": "A dummy event occurred.", "importance": 3}\n{"text": "Your input was: '${lastUserMessage}'.", "importance": 1}\n@scene\n{"location": "dummy_location", "present": []}\n` +
          `The dummy narrator responds to your action: "${lastUserMessage}". A gentle breeze rustles through the imaginary trees, and you feel slightly less real. Your health is now 99, and you found 1 gold coin.`
        }
      }],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 50,
        total_tokens: 60,
      }
    };
    return Promise.resolve(JSON.stringify(dummyResponse)); // Return as stringified JSON
  }

  async testConnection(connection: AiConnection): Promise<boolean> {
    return Promise.resolve(true); // Dummy always passes test
  }
}

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
   * @param useDummyNarrator Flag to indicate if dummy AI should be used.
   * @returns A Promise resolving with the AI's response and any state changes.
   */
  processPlayerAction(action: string, useDummyNarrator: boolean): Promise<{ aiProse: string; newLogEntries: LogEntry[]; updatedSnapshot: GameSnapshot }>;

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
export class GameSession implements IGameSession { // Export the class
  private currentUserId: string | null = null;
  private currentSnapshot: GameSnapshot | null = null;
  private currentPromptCard: PromptCard | null = null; // Store active card to avoid re-fetching

  // Store the real AI client and a dummy one
  private realAiClient: IAiClient;
  private dummyAiClient: IAiClient = new DummyAiClient(); // Instantiate dummy client

  constructor(
    private cardRepo: IPromptCardRepository,
    private gameRepo: IGameRepository,
    private builder: IPromptBuilder,
    aiClientInstance: IAiClient, // Receive the real AI client here
    private logManager: ILogManager,
  ) {
    this.realAiClient = aiClientInstance;
  }

  async initializeGame(userId: string, cardId: string, existingSnapshotId?: string): Promise<void> {
    this.currentUserId = userId;
    console.log(`GameSession: Initializing game for user ${userId} with card ${cardId}. Existing Snapshot ID: ${existingSnapshotId || 'None'}`);

    const card = await this.cardRepo.getPromptCard(userId, cardId);
    if (!card) {
      console.error(`GameSession: PromptCard with ID ${cardId} not found for user ${userId}.`);
      throw new Error(`PromptCard with ID ${cardId} not found for user ${userId}. Cannot start game.`);
    }
    this.currentPromptCard = card;
    console.log(`GameSession: PromptCard "${card.title}" loaded.`);


    if (existingSnapshotId) {
      console.log(`GameSession: Attempting to load existing snapshot ${existingSnapshotId}...`);
      const snapshot = await this.gameRepo.getGameSnapshot(userId, existingSnapshotId);
      if (!snapshot) {
        console.error(`GameSession: Game snapshot with ID ${existingSnapshotId} not found for user ${userId}.`);
        throw new Error(`Game snapshot with ID ${existingSnapshotId} not found for user ${userId}.`);
      }
      this.currentSnapshot = snapshot;
      console.log(`GameSession: Loaded existing game snapshot: ${snapshot.id}. Current turn: ${snapshot.currentTurn}`);
    } else {
      console.log('GameSession: Starting a new game...');
      const newSnapshotId = generateUuid();
      const now = new Date().toISOString();

      const initialGameState: GameState = {
        narration: "A new adventure begins...",
        worldState: {},
        scene: { location: null, present: [] },
      };

      let initialDeltas: DeltaMap = {};

      if (card.worldStateInit && card.worldStateInit.trim().length > 0) {
        try {
          const parsedInit = JSON.parse(card.worldStateInit);
          if (typeof parsedInit === 'object' && parsedInit !== null && !Array.isArray(parsedInit)) {
            initialGameState.worldState = parsedInit;
            console.log("GameSession: Applied initial worldState from PromptCard.");

            for (const key in parsedInit) {
                if (Object.prototype.hasOwnProperty.call(parsedInit, key)) {
                    initialDeltas[`!${key}`] = { op: 'declare', key: key, value: parsedInit[key] };
                }
            }
            console.log("GameSession: Generated initial deltas from worldStateInit:", initialDeltas);

          } else {
            console.warn("GameSession: PromptCard worldStateInit is not a valid JSON object, ignoring:", card.worldStateInit);
          }
        } catch (e) {
          console.error("GameSession: Failed to parse PromptCard worldStateInit JSON:", e);
        }
      }

      // Fetch the selected AI connection to populate initial log details
      let initialConnection: AiConnection | undefined;
      try {
          const connections = await this.gameRepo.getAiConnections(userId);
          initialConnection = connections.find(c => c.id === card.aiSettings.selectedConnectionId);
          if (!initialConnection) {
              console.warn(`GameSession: Initial AI connection ${card.aiSettings.selectedConnectionId} not found. Using default/empty values for initial log.`);
              initialConnection = {
                  id: 'unknown', displayName: 'Unknown Connection', modelName: 'Unknown', modelSlug: 'unknown',
                  apiUrl: 'N/A', apiToken: 'N/A', functionCallingEnabled: false, createdAt: '', lastUpdated: ''
              };
          }
      } catch (e) {
          console.error("GameSession: Error fetching AI connections during initialization:", e);
          initialConnection = {
              id: 'error', displayName: 'Error Fetching', modelName: 'Error', modelSlug: 'error',
              apiUrl: 'Error', apiToken: 'Error', functionCallingEnabled: false, createdAt: '', lastUpdated: ''
          };
      }


      // Build the prompt for the first turn to capture its context
      const firstTurnPromptMessages = this.builder.buildFirstTurnPrompt(card);
      const initialContextSnapshot = JSON.stringify(firstTurnPromptMessages, null, 2); // Pretty print for log readability


      this.currentSnapshot = {
        id: newSnapshotId,
        userId: userId,
        promptCardId: card.id,
        createdAt: now,
        updatedAt: now,
        currentTurn: 0,
        gameState: initialGameState,
        conversationHistory: [],
        logs: [],
        worldStatePinnedKeys: [],
      };
      console.log(`GameSession: Initialized new game snapshot with ID: ${newSnapshotId}.`);

      const initialLogEntry = this.logManager.assembleTurnLogEntry({
          turnNumber: 0,
          userInput: "Game Initialized",
          rawNarratorOutput: initialGameState.narration,
          parsedOutput: {
              prose: initialGameState.narration,
              deltas: initialDeltas,
              digestLines: this.logManager.inferDigestLinesFromDeltas(initialDeltas, initialGameState.narration),
              scene: initialGameState.scene,
          },
          contextSnapshot: initialContextSnapshot, // Use the actual first turn prompt
          tokenUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
          aiSettings: card.aiSettings,
          apiRequestBody: null,
          apiResponseBody: null,
          apiUrl: initialConnection.apiUrl, // Use configured API URL
          latencyMs: null,
          modelSlugUsed: initialConnection.modelSlug, // Use configured model slug
      });
      this.currentSnapshot.logs.push(initialLogEntry);
      console.log(`GameSession: Added initial log entry for turn 0.`);

      try {
          console.log(`GameSession: Attempting to save new game snapshot ${newSnapshotId} to Firestore.`);
          await this.gameRepo.saveGameSnapshot(userId, this.currentSnapshot);
          console.log(`GameSession: New game snapshot ${newSnapshotId} successfully saved to Firestore.`);
      } catch (saveError) {
          console.error(`GameSession: Failed to save new game snapshot ${newSnapshotId} to Firestore:`, saveError);
          throw new Error(`Failed to save initial game snapshot: ${saveError instanceof Error ? saveError.message : 'Unknown error'}`);
      }
    }
    console.log(`GameSession: Initialization complete. currentSnapshot is now set to ${this.currentSnapshot?.id}.`);
  }

  async processPlayerAction(action: string, useDummyNarrator: boolean): Promise<{ aiProse: string; newLogEntries: LogEntry[]; updatedSnapshot: GameSnapshot }> { // Added useDummyNarrator
    if (!this.currentSnapshot || !this.currentUserId || !this.currentPromptCard) {
      throw new Error("Game not initialized. Call initializeGame first.");
    }
    const userId = this.currentUserId;
    const currentSnapshot = this.currentSnapshot;
    const promptCard = this.currentPromptCard; // Use the stored prompt card

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

    let aiRawOutput: string = "";
    let aiResponseLatencyMs: number | null = null;
    let aiModelSlugUsed: string = "";
    let aiApiUrl: string | null = null;
    let aiApiRequestBody: string | null = JSON.stringify({ // Capture request body
        model: promptCard.aiSettings.selectedConnectionId, // Placeholder; actual model slug comes from AiConnection
        messages: messagesToSend.map(m => ({ role: m.role, content: m.content })) // Simplified for logging
    });
    let aiApiResponseBody: string | null = null;
    let aiTokenUsage: any = null; // TokenSummary from AI not implemented yet

    try {
        const activeAiClient = useDummyNarrator ? this.dummyAiClient : this.realAiClient; // Choose AI client
        let connection: AiConnection | undefined;

        if (!useDummyNarrator) { // Only fetch real connection for real AI
            connection = (await this.gameRepo.getAiConnections(userId)).find(c => c.id === promptCard.aiSettings.selectedConnectionId);
            if (!connection) {
                throw new Error(`AI connection ${promptCard.aiSettings.selectedConnectionId} not found.`);
            }
            aiModelSlugUsed = connection.modelSlug;
            aiApiUrl = new URL("chat/completions", connection.apiUrl).href;
        } else {
            // Dummy connection details for logging
            connection = {
                id: 'dummy', displayName: 'Dummy Narrator', modelName: 'Dummy', modelSlug: 'dummy',
                apiUrl: 'n/a', apiToken: 'n/a', functionCallingEnabled: false, createdAt: '', lastUpdated: ''
            };
            aiModelSlugUsed = 'dummy-narrator';
            aiApiUrl = 'local-dummy-url';
            aiApiRequestBody = "Dummy Request";
        }

        const startTime = performance.now();
        // CALL TO AI CLIENT - will now return full response with token usage
        const fullAiResponse = await activeAiClient.generateCompletion(
            connection, // Pass the connection (even dummy one)
            messagesToSend,
            promptCard.aiSettings
        );
        aiResponseLatencyMs = Math.round(performance.now() - startTime);

        let parsedAiJson;
        try {
            parsedAiJson = JSON.parse(fullAiResponse); // Attempt to parse if it's JSON string
            aiRawOutput = parsedAiJson.choices?.[0]?.message?.content?.trim() || "";
            // Extract token usage if available in the parsed JSON
            aiTokenUsage = parsedAiJson.usage ? {
                inputTokens: parsedAiJson.usage.prompt_tokens || 0,
                outputTokens: parsedAiJson.usage.completion_tokens || 0,
                totalTokens: parsedAiJson.usage.total_tokens || 0,
                // cachedTokens: ... if your API provides this
            } : null;
            aiApiResponseBody = fullAiResponse; // Store raw response body
        } catch (parseError) {
            // If it's not JSON, assume it's just the content string directly
            aiRawOutput = fullAiResponse;
            aiApiResponseBody = fullAiResponse; // Store raw response body
            console.warn("AI Client returned non-JSON string or malformed JSON. Assuming raw content.", parseError);
        }

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
    const parsedAiOutput = this.builder.parseNarratorOutput(aiRawOutput);

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
      apiRequestBody: aiApiRequestBody,
      apiResponseBody: aiApiResponseBody, // Use captured response body
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
    console.log('GameSession: getCurrentGameSnapshot called. Returning snapshot with ID:', this.currentSnapshot?.id || 'null');
    return this.currentSnapshot;
  }

  getCurrentPromptCard(): PromptCard | null {
    return this.currentPromptCard; // Return the stored active card
  }

  getCurrentGameState(): GameState | null {
    return this.currentSnapshot ? this.currentSnapshot.gameState : null;
  }

  getGameLogs(): LogEntry[] {
    return this.currentSnapshot ? this.currentSnapshot.logs : [];
  }

  async saveGame(): Promise<void> {
    if (!this.currentUserId || !this.currentSnapshot) {
      console.warn("GameSession: Cannot save game: user or game snapshot not initialized.");
      return;
    }
    console.log(`GameSession: Saving game snapshot ${this.currentSnapshot.id} for user ${this.currentUserId}.`);
    await this.gameRepo.saveGameSnapshot(this.currentUserId, this.currentSnapshot);
    console.log(`GameSession: Game snapshot ${this.currentSnapshot.id} saved successfully.`);
  }

  async loadGame(snapshotId: string): Promise<void> {
    if (!this.currentUserId) {
      throw new Error("Cannot load game: user not initialized.");
    }
    console.log(`GameSession: Attempting to load game snapshot ${snapshotId} for user ${this.currentUserId}.`);
    const snapshot = await this.gameRepo.getGameSnapshot(this.currentUserId, snapshotId);
    if (!snapshot) {
      console.error(`GameSession: Game snapshot ${snapshotId} not found for user ${this.currentUserId}.`);
      throw new Error(`Game snapshot ${snapshotId} not found for user ${this.currentUserId}.`);
    }
    this.currentSnapshot = snapshot;
    // Also load the associated PromptCard when a game is loaded
    const card = await this.cardRepo.getPromptCard(this.currentUserId, snapshot.promptCardId);
    if (!card) {
        console.warn(`GameSession: PromptCard ${snapshot.promptCardId} for loaded game ${snapshotId} not found.`);
        this.currentPromptCard = null;
    } else {
        this.currentPromptCard = card;
        console.log(`GameSession: Associated PromptCard "${card.title}" loaded for snapshot ${snapshotId}.`);
    }

    console.log(`GameSession: Game snapshot ${snapshotId} loaded. Current turn: ${this.currentSnapshot.currentTurn}.`);
  }

  /**
   * Applies DeltaInstruction objects to the game's worldState.
   * This is a direct translation and simplification of GameState.applyDeltas.
   * Assumes 'player' fields like hp/gold/narration are now part of worldState.
   * This logic now lives here, or could be a private helper in deltaParser if desired.
   */
  private applyDeltasToGameState(gameState: GameState, deltas: DeltaMap): void {
    const updatedWorld = { ...gameState.worldState }; // Create a mutable copy of worldState
    console.log('GameSession: Applying deltas to worldState. Initial state:', JSON.stringify(updatedWorld));

    for (const fullKey in deltas) {
      const instruction = deltas[fullKey];
      const parts = instruction.key.split('.'); // instruction.key now holds the path like "player.hp"

      // Traverse or create path
      let currentLevel: Record<string, any> = updatedWorld;
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!currentLevel[part] || typeof currentLevel[part] !== 'object' || Array.isArray(currentLevel[part])) {
          currentLevel[part] = {}; // Create if non-existent or not an object
          console.log(`GameSession: Created nested object at path: ${parts.slice(0, i + 1).join('.')}`);
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
          console.log(`GameSession: Delta ADD: ${instruction.key} from ${prevAddValue} to ${currentLevel[lastPart]}`);
          break;
        case 'assign':
          currentLevel[lastPart] = instruction.value;
          console.log(`GameSession: Delta ASSIGN: ${instruction.key} = ${JSON.stringify(instruction.value)}`);
          break;
        case 'declare':
          if (!(lastPart in currentLevel)) { // Only declare if not already present
            currentLevel[lastPart] = instruction.value;
            console.log(`GameSession: Delta DECLARE: ${instruction.key} = ${JSON.stringify(instruction.value)} (new)`);
          } else {
            console.log(`GameSession: Delta DECLARE: ${instruction.key} already exists, not declared.`);
          }
          break;
        case 'delete':
          delete currentLevel[lastPart];
          console.log(`GameSession: Delta DELETE: ${instruction.key}`);
          break;
      }
    }
    gameState.worldState = updatedWorld; // Assign the updated worldState back
    console.log('GameSession: Deltas applied. Final worldState:', JSON.stringify(gameState.worldState));
  }

  /**
   * Updates the SceneState based on parsed AI output or infers from deltas.
   * Replicates logic from SceneManager.
   */
  private updateSceneState(currentScene: SceneState, parsedScene: Record<string, any> | null | undefined, deltas: DeltaMap, worldState: Record<string, any>): void {
    console.log('GameSession: Updating scene state. Current:', currentScene);
    let newLocation: string | null = currentScene.location;
    let newPresent: string[] = currentScene.present;

    // Prioritize explicit @scene block
    if (parsedScene) {
      if (parsedScene.location !== undefined) {
        newLocation = typeof parsedScene.location === 'string' ? parsedScene.location : null;
        console.log(`GameSession: Scene updated by @scene block: location = ${newLocation}`);
      }
      if (Array.isArray(parsedScene.present)) {
        newPresent = parsedScene.present.filter((item: any) => typeof item === 'string');
        console.log(`GameSession: Scene updated by @scene block: present = ${JSON.stringify(newPresent)}`);
      }
    } else {
      // Fallback: Infer from deltas if scene was not explicitly provided by AI
      // Only infer if current scene is empty or not yet set
      if (!newLocation && newPresent.length === 0 && deltas) {
        console.log('GameSession: Inferring scene from deltas (no explicit @scene block found).');
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
                console.log(`GameSession: Inferred present entity from delta: ${category}.${entity}`);
              }
            }
            if (instruction.key === "world.location" && typeof instruction.value === 'string') {
              newLocation = instruction.value;
              console.log(`GameSession: Inferred location from delta: ${newLocation}`);
            }
          }
        }
        newPresent = Array.from(inferredPresent);
      }
    }

    currentScene.location = newLocation;
    currentScene.present = newPresent;
    console.log('GameSession: Final scene state after update:', currentScene);
  }
}

// Export the GameSession class to be instantiated in main.tsx
// REMOVED: export const gameSession = new GameSession(...);