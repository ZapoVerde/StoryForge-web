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
import { formatIsoDateForDisplay } from '../utils/formatDate'; // Import for consistent date formatting in title

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
          content: `@delta
{"=player.hp": 99, "+player.gold": 1}
@digest
{"text": "A dummy event occurred.", "importance": 3}
{"text": "Your input was: '$'.", "importance": 1}
@scene
{"location": "dummy_location", "present": []}
` +
            `The dummy narrator responds to your action: "$". A gentle breeze rustles through the imaginary trees, and you feel slightly less real. Your health is now 99, and you found 1 gold coin.`
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
   * @param snapshot The GameSnapshot object to save. // MODIFIED: Add parameter
   * @returns A Promise resolving when the game is saved.
   */
  saveGame(snapshot: GameSnapshot): Promise<void>;

  /**
   * Loads a game snapshot.
   * @param snapshotId The ID of the snapshot to load.
   * @returns A Promise resolving when the game is loaded.
   */
  loadGame(userId: string, snapshotId: string): Promise<void>;

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
  private currentPromptCard: PromptCard | null = null;
  private realAiClient: IAiClient;
  private dummyAiClient: IAiClient = new DummyAiClient();

  constructor(
    private cardRepo: IPromptCardRepository,
    private gameRepo: IGameRepository,
    private builder: IPromptBuilder,
    aiClientInstance: IAiClient,
    private logManager: ILogManager,
  ) {
    this.realAiClient = aiClientInstance;
  }

  // *** NEW METHOD: processFirstTurn ***
  /**
   * Processes the very first turn of the game (Turn 0), which is driven by the AI.
   * This method builds the initial prompt, calls the AI, and creates the first log entry.
   * @param useDummyNarrator Flag to indicate if the dummy AI should be used.
   */
  public async processFirstTurn(useDummyNarrator: boolean): Promise<void> {
    if (!this.currentSnapshot || !this.currentUserId || !this.currentPromptCard) {
      throw new Error("Cannot process first turn: Game not initialized correctly.");
    }
    console.log("GameSession: Processing first turn (Turn 0)...");

    const snapshot = this.currentSnapshot;
    const card = this.currentPromptCard;
    const userId = this.currentUserId;
    const turnNumber = 0;
    const userInputForLog = card.firstTurnOnlyBlock || "Begin the story."; // The "input" for this turn.

    // 1. Build the special first-turn prompt
    const messagesToSend = this.builder.buildFirstTurnPrompt(card);
    const contextSnapshotForLog = JSON.stringify(messagesToSend, null, 2);

    // 2. Execute AI call and get response (logic is similar to processPlayerAction)
    let aiRawOutput: string = "";
    let aiResponseLatencyMs: number | null = null;
    let aiModelSlugUsed: string = "";
    let aiApiUrl: string | null = null;
    let aiApiRequestBody: string | null = JSON.stringify({ model: card.aiSettings.selectedConnectionId, messages: "..." }, null, 2); // Placeholder for request body
    let aiApiResponseBody: string | null = null; // Placeholder for response body
    let aiTokenUsage: any = null;

    try {
      const activeAiClient = useDummyNarrator ? this.dummyAiClient : this.realAiClient;

      let connection: AiConnection | undefined;
      if (!useDummyNarrator) {
        const connections = await this.gameRepo.getAiConnections(userId);
        connection = connections.find(c => c.id === card.aiSettings.selectedConnectionId);
        if (!connection) {
          throw new Error(`AI connection ${card.aiSettings.selectedConnectionId} not found.`);
        }
        aiModelSlugUsed = connection.modelSlug;
        aiApiUrl = new URL("chat/completions", connection.apiUrl).href;
      } else {
        connection = {
          id: 'dummy', displayName: 'Dummy Narrator', modelName: 'Dummy', modelSlug: 'dummy-narrator',
          apiUrl: 'n/a', apiToken: 'n/a', functionCallingEnabled: false, createdAt: '', lastUpdated: ''
        };
        aiModelSlugUsed = 'dummy-narrator';
        aiApiUrl = 'local-dummy-url';
      }

      const startTime = performance.now();
      const fullAiResponse = await activeAiClient.generateCompletion(connection, messagesToSend, card.aiSettings);
      aiResponseLatencyMs = Math.round(performance.now() - startTime);

      let parsedAiJson;
      try {
        parsedAiJson = JSON.parse(fullAiResponse);
        aiRawOutput = parsedAiJson.choices?.[0]?.message?.content?.trim() || "";
        aiTokenUsage = parsedAiJson.usage ? {
          inputTokens: parsedAiJson.usage.prompt_tokens || 0,
          outputTokens: parsedAiJson.usage.completion_tokens || 0,
          totalTokens: parsedAiJson.usage.total_tokens || 0,
        } : null;
        aiApiResponseBody = fullAiResponse; // Assign the full response to the variable
      } catch (parseError) {
        aiRawOutput = fullAiResponse;
        aiApiResponseBody = fullAiResponse; // Assign the full response if parsing fails
      }
    } catch (e: any) {
      console.error("First turn AI call failed:", e);
      aiRawOutput = `AI system error during initialization: ${e.message}. The story cannot begin. Please check your AI settings and try again.`;
      // The error will be logged and shown to the user.
    }

    // 3. Process AI output
    const parsedAiOutput = this.builder.parseNarratorOutput(aiRawOutput);

    // 4. Update Game State
    snapshot.conversationHistory.push({ role: 'assistant', content: parsedAiOutput.prose });
    snapshot.gameState.narration = parsedAiOutput.prose;

    if (parsedAiOutput.deltas) {
      this.applyDeltasToGameState(snapshot.gameState, parsedAiOutput.deltas);
    }
    this.updateSceneState(snapshot.gameState.scene, parsedAiOutput.scene, parsedAiOutput.deltas, snapshot.gameState.worldState);

    // 5. Create LogEntry
    const newLogEntry = this.logManager.assembleTurnLogEntry({
      turnNumber: turnNumber,
      userInput: userInputForLog,
      rawNarratorOutput: aiRawOutput,
      parsedOutput: parsedAiOutput,
      contextSnapshot: contextSnapshotForLog,
      tokenUsage: aiTokenUsage,
      aiSettings: card.aiSettings,
      apiRequestBody: aiApiRequestBody, // Corrected variable name
      apiResponseBody: aiApiResponseBody, // Corrected variable name
      apiUrl: aiApiUrl,
      latencyMs: aiResponseLatencyMs,
      modelSlugUsed: aiModelSlugUsed,
    });
    snapshot.logs.push(newLogEntry);

    // 6. Update snapshot metadata
    snapshot.currentTurn = turnNumber;
    snapshot.updatedAt = new Date().toISOString();

    // 7. Save the fully initialized snapshot
    await this.saveGame(snapshot);
    console.log("GameSession: First turn processed and saved. Snapshot ID:", snapshot.id);
  }

  // *** UPDATED METHOD: initializeGame ***
  async initializeGame(userId: string, cardId: string, existingSnapshotId?: string, useDummyNarrator: boolean = false): Promise<void> {
    this.currentUserId = userId;
    console.log(`GameSession: Initializing game for user $ with card $. Existing Snapshot ID: ${existingSnapshotId || 'None'}`);

    const card = await this.cardRepo.getPromptCard(userId, cardId);
    if (!card) {
      console.error(`GameSession: PromptCard with ID $ not found for user $.`);
      throw new Error(`PromptCard with ID $ not found for user $. Cannot start game.`);
    }
    this.currentPromptCard = card;
    console.log(`GameSession: PromptCard "${card.title}" loaded.`);

    if (existingSnapshotId) {
      // Loading an existing game remains the same
      console.log(`GameSession: Attempting to load existing snapshot $...`);
      await this.loadGame(userId, existingSnapshotId);
    } else {
      // This is the new, improved flow for starting a new game
      console.log('GameSession: Starting a new game...');
      const newSnapshotId = generateUuid();
      const now = new Date().toISOString();
      const gameTitle = `${card.title} - ${formatIsoDateForDisplay(now)}`;

      const initialGameState: GameState = {
        narration: "Initializing your adventure...", // This is a temporary message
        worldState: {},
        scene: { location: null, present: [] },
      };

      if (card.worldStateInit && card.worldStateInit.trim().length > 0) {
        try {
          initialGameState.worldState = JSON.parse(card.worldStateInit);
          console.log("GameSession: Applied initial worldState from PromptCard.");
        } catch (e) {
          console.error("GameSession: Failed to parse PromptCard worldStateInit JSON:", e);
        }
      }

      // Create a temporary snapshot object in memory. It will be finalized and saved by processFirstTurn.
      this.currentSnapshot = {
        id: newSnapshotId,
        userId: userId,
        promptCardId: card.id,
        title: gameTitle,
        createdAt: now,
        updatedAt: now,
        currentTurn: -1, // Start at -1. processFirstTurn will set it to 0.
        gameState: initialGameState,
        conversationHistory: [], // Start empty. The AI's response will be the first entry.
        logs: [], // Start with empty logs.
        worldStatePinnedKeys: [],
      };

      console.log(`GameSession: Created temporary snapshot ${this.currentSnapshot.id}. Now processing first turn...`);

      // Now, execute the first AI turn to get the actual starting narration.
      try {
        await this.processFirstTurn(useDummyNarrator);
        console.log("GameSession: First turn processed successfully during initialization.");
      } catch (initError) {
        console.error("GameSession: FAILED to process the first turn during initialization:", initError);
        throw new Error(`Failed to initialize the game with the AI: ${initError instanceof Error ? initError.message : 'Unknown error'}`);
      }
    }

    console.log(`GameSession: Initialization complete. currentSnapshot is now set to ${this.currentSnapshot?.id}.`);
  }

  // *** NEWLY IMPLEMENTED METHOD: loadGame ***
  /**
   * Loads an existing game snapshot and its associated prompt card into the session.
   * @param userId The ID of the user owning the game.
   * @param snapshotId The ID of the game snapshot to load.
   */
  public async loadGame(userId: string, snapshotId: string): Promise<void> {
    console.log(`GameSession: Loading game snapshot ID ${snapshotId} for user ${userId}.`);

    // 1. Fetch the game snapshot from the repository.
    const snapshot = await this.gameRepo.getGameSnapshot(userId, snapshotId);
    if (!snapshot) {
      throw new Error(`Game snapshot with ID ${snapshotId} not found for user ${userId}.`);
    }

    // 2. Fetch the associated prompt card.
    const card = await this.cardRepo.getPromptCard(userId, snapshot.promptCardId);
    if (!card) {
      throw new Error(`Associated PromptCard with ID ${snapshot.promptCardId} not found for snapshot ${snapshotId}.`);
    }

    // 3. Set the internal state of the session.
    this.currentUserId = userId;
    this.currentSnapshot = snapshot;
    this.currentPromptCard = card;

    console.log(`GameSession: Successfully loaded game "${snapshot.title}" and card "${card.title}".`);
  }

  /**
 * Retrieves the current game state snapshot held by the session.
 * @returns The current GameSnapshot or null if not initialized.
 */
public getCurrentGameSnapshot(): GameSnapshot | null {
    return this.currentSnapshot;
}


  /**
 * Saves the current game state to the repository.
 * @param snapshot The GameSnapshot object to save.
 * @returns A Promise resolving when the game is saved.
 */
public async saveGame(snapshot: GameSnapshot): Promise<void> {
    if (!this.currentUserId) {
        console.error("GameSession: Cannot save game because userId is not set.");
        throw new Error("User is not initialized in the game session.");
    }
    if (!snapshot) {
        console.warn("GameSession: saveGame was called with an empty snapshot.");
        return;
    }

    try {
        // Use the game repository to persist the snapshot
        await this.gameRepo.saveGameSnapshot(this.currentUserId, snapshot);
        console.log(`GameSession: Successfully saved snapshot ${snapshot.id}.`);
    } catch (e) {
        console.error(`GameSession: An error occurred while saving snapshot ${snapshot.id}.`, e);
        // Re-throw the error to be caught by the caller (e.g., the UI layer)
        throw e;
    }
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
          console.log(`GameSession: Delta ADD: ${instruction.key} from $ to ${currentLevel[lastPart]}`);
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
        console.log(`GameSession: Scene updated by @scene block: location = $`);
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
                inferredPresent.add(`$.$`);
                console.log(`GameSession: Inferred present entity from delta: $.$`);
              }
            }
            if (instruction.key === "world.location" && typeof instruction.value === 'string') {
              newLocation = instruction.value;
              console.log(`GameSession: Inferred location from delta: $`);
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