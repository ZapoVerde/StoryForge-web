// src/logic/gameSession.ts

import { PromptCard } from '../models/PromptCard';
// We will import GameSnapshot and LogEntry when they are defined
// import { GameSnapshot } from '../models/GameSnapshot';
// import { LogEntry } from '../models/LogEntry';

import { promptBuilder, IPromptBuilder } from './promptBuilder'; // Import our prompt builder
import { promptCardRepository, IPromptCardRepository } from '../data/repositories/promptCardRepository'; // Used for initial setup/loading

// Placeholder types for now until defined by user
type GameSnapshot = any;
type LogEntry = any;

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
   * Corresponds to StoryForgeViewModel.processAction.
   * @param action The player's input string.
   * @returns A Promise resolving with the AI's response and any state changes.
   */
  processPlayerAction(action: string): Promise<{ aiResponse: string; newLogEntries: LogEntry[]; updatedSnapshot: GameSnapshot }>;

  /**
   * Retrieves the current game state.
   * @returns The current GameSnapshot (placeholder).
   */
  getCurrentGameState(): GameSnapshot | null;

  /**
   * Retrieves the current game logs.
   * @returns An array of LogEntry (placeholder).
   */
  getGameLogs(): LogEntry[];

  /**
   * Retrieves the PromptCard associated with the current session.
   * @returns The PromptCard for the session.
   */
  getCurrentPromptCard(): PromptCard | null;

  /**
   * Saves the current game state.
   * Corresponds to StoryForgeViewModel.save flow.
   * @returns A Promise resolving when the game is saved.
   */
  saveGame(): Promise<void>;

  /**
   * Loads a game snapshot.
   * Corresponds to StoryForgeViewModel.load flow.
   * @param snapshotId The ID of the snapshot to load.
   * @returns A Promise resolving when the game is loaded.
   */
  loadGame(snapshotId: string): Promise<void>;
}

/**
 * Concrete implementation of IGameSession.
 */
export class GameSession implements IGameSession {
  private currentUserId: string | null = null;
  private currentPromptCard: PromptCard | null = null;
  private currentGameState: GameSnapshot | null = null; // Placeholder
  private currentLogEntries: LogEntry[] = []; // Placeholder

  constructor(
    private cardRepo: IPromptCardRepository,
    private builder: IPromptBuilder,
    // When logManager and gameRepository are defined, they will be injected here.
    // private logManager: ILogManager,
    // private gameRepo: IGameRepository,
  ) {}

  async initializeGame(userId: string, cardId: string, existingSnapshotId?: string): Promise<void> {
    this.currentUserId = userId;
    const card = await this.cardRepo.getPromptCard(userId, cardId);
    if (!card) {
      throw new Error(`PromptCard with ID ${cardId} not found for user ${userId}. Cannot start game.`);
    }
    this.currentPromptCard = card;

    if (existingSnapshotId) {
      // TODO: Implement actual loading logic using gameRepository
      console.log(`Loading existing game snapshot: ${existingSnapshotId} (NOT YET IMPLEMENTED)`);
      // const snapshot = await this.gameRepo.loadSnapshot(userId, existingSnapshotId);
      // if (snapshot) {
      //   this.currentGameState = snapshot;
      //   this.currentLogEntries = snapshot.logs;
      // }
    } else {
      // Start a new game
      this.currentGameState = {
        // Initial game state from card.worldStateInit or defaults.
        // This will be parsed and structured properly later.
        turnCount: 0,
        scene: "A new adventure begins...",
        // other initial state properties
      };
      this.currentLogEntries = [];
      console.log(`Initialized new game with card: ${card.title}`);
      // Generate first turn prompt to show to user initially
      const firstTurnPrompt = this.builder.buildFirstTurnPrompt(this.currentPromptCard);
      console.log("First Turn Prompt (for AI):", firstTurnPrompt);
      // In a real scenario, this would be sent to the AI and its response processed.
      // For now, it's just for display/logging.
    }
  }

  async processPlayerAction(action: string): Promise<{ aiResponse: string; newLogEntries: LogEntry[]; updatedSnapshot: GameSnapshot }> {
    if (!this.currentPromptCard || !this.currentUserId) {
      throw new Error("Game not initialized. Call initializeGame first.");
    }

    // 1. Build prompt for AI (including dynamic context)
    const fullPrompt = this.builder.buildEveryTurnPrompt(
      this.currentPromptCard,
      this.currentGameState, // Placeholder
      this.currentLogEntries // Placeholder
    );
    console.log("Full prompt for AI:", fullPrompt);
    console.log("Player action:", action);

    // 2. Call AI (Placeholder)
    // In a real scenario, this would involve an API call to an LLM.
    const aiRawOutput = `Narrator: You take a step forward. The air grows colder.
    {"delta": "The goblin recoils."}`; // Mock AI response

    // 3. Process AI output with deltaParser (Placeholder)
    // TODO: Implement deltaParser.ts
    const processedAiOutput: { prose: string; deltas: any[]; tags: string[] } = {
        prose: aiRawOutput.split('{"delta":')[0].trim(),
        deltas: [{ type: 'mock', value: 'The goblin recoils.' }],
        tags: ['goblin']
    };
    console.log("Processed AI Output:", processedAiOutput);

    // 4. Update Game State & Logs (Placeholder for LogManager)
    // TODO: Implement logManager.ts to add new log entry
    // TODO: Apply deltas to currentGameState
    const newLogEntry: LogEntry = {
        type: 'narrator',
        timestamp: new Date().toISOString(),
        prose: processedAiOutput.prose,
        deltas: processedAiOutput.deltas,
        tags: processedAiOutput.tags,
        // ... more properties as per LogEntry model
    };
    this.currentLogEntries.push(newLogEntry);
    this.currentGameState.turnCount++; // Increment turn count
    this.currentGameState.scene = "The path ahead is misty."; // Mock scene update

    console.log("Updated Game State (Mock):", this.currentGameState);
    console.log("New Log Entry (Mock):", newLogEntry);


    // 5. Save Game State (Placeholder)
    // TODO: Call gameRepository.saveGame(this.currentUserId, this.currentGameState);
    await this.saveGame(); // For now, just calls the placeholder saveGame

    return {
      aiResponse: processedAiOutput.prose,
      newLogEntries: [newLogEntry],
      updatedSnapshot: this.currentGameState,
    };
  }

  getCurrentGameState(): GameSnapshot | null {
    return this.currentGameState;
  }

  getGameLogs(): LogEntry[] {
    return this.currentLogEntries;
  }

  getCurrentPromptCard(): PromptCard | null {
    return this.currentPromptCard;
  }

  async saveGame(): Promise<void> {
    if (!this.currentUserId || !this.currentGameState) {
      console.warn("Cannot save game: user or game state not initialized.");
      return;
    }
    // TODO: Implement actual save logic using gameRepository
    console.log(`Saving game for user ${this.currentUserId}... (NOT YET IMPLEMENTED)`);
    // await this.gameRepo.saveGame(this.currentUserId, this.currentGameState);
  }

  async loadGame(snapshotId: string): Promise<void> {
    if (!this.currentUserId) {
      throw new Error("Cannot load game: user not initialized.");
    }
    // TODO: Implement actual load logic using gameRepository
    console.log(`Loading game snapshot: ${snapshotId} for user ${this.currentUserId}... (NOT YET IMPLEMENTED)`);
    // const snapshot = await this.gameRepo.loadGame(this.currentUserId, snapshotId);
    // if (snapshot) {
    //   this.currentGameState = snapshot;
    //   this.currentLogEntries = snapshot.logs;
    //   // Rehydrate prompt card if stored in snapshot or fetch it.
    // } else {
    //   throw new Error(`Game snapshot ${snapshotId} not found.`);
    // }
  }
}

// Export a singleton instance of the GameSession
// It injects the necessary dependencies (repositories, builders).
export const gameSession = new GameSession(promptCardRepository, promptBuilder);