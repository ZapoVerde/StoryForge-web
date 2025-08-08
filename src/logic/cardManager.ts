// src/logic/cardManager.ts

import type { PromptCard, NewPromptCardData, StackInstructions} from '../models';
import { generateUuid } from '../utils/uuid';
import { generateContentHash, getPromptCardContentForHash } from '../utils/hash';
import { promptCardRepository } from '../data/repositories/promptCardRepository';
import type { IPromptCardRepository } from '../data/repositories/promptCardRepository';

import { debugLog, errorLog } from '../utils/debug';
import {
  defaultAiSettingsInCard,
  defaultStackInstructions,
  DEFAULT_FIRST_TURN_PROMPT_BLOCK,
  DEFAULT_EMIT_SKELETON_STRING,
} from '../data/config/promptCardDefaults';

/**
 * Interface defining the contract for the Card Manager.
 * This can be useful for testing or providing different implementations (e.g., a mock manager).
 */
export interface ICardManager {
  /**
   * Creates a brand new PromptCard with default values for unspecified fields.
   * Generates new IDs and hash, sets creation/update timestamps.
   * @param userId The ID of the user creating the card.
   * @param data The initial data for the new card.
   * @returns A Promise resolving with the newly created PromptCard.
   */
  createNewPromptCard(userId: string, data: NewPromptCardData): Promise<PromptCard>;

  /**
   * Updates an existing PromptCard. Recalculates the content hash and updates the timestamp.
   * @param userId The ID of the user owning the card.
   * @param cardId The ID of the card to update.
   * @param updates The partial PromptCard data to apply.
   * @returns A Promise resolving with the updated PromptCard or null if not found.
   */
  updatePromptCard(userId: string, cardId: string, updates: Partial<PromptCard>): Promise<PromptCard | null>;

  /**
   * Duplicates an existing PromptCard, creating a new card with a new ID
   * but linking it to the original's lineage (parentId, rootId).
   * @param userId The ID of the user performing the duplication.
   * @param sourceCardId The ID of the card to duplicate.
   * @returns A Promise resolving with the new, duplicated PromptCard or null if source not found.
   */
  duplicatePromptCard(userId: string, sourceCardId: string): Promise<PromptCard | null>;

  /**
   * Deletes a PromptCard.
   * @param userId The ID of the user owning the card.
   * @param cardId The ID of the card to delete.
   * @returns A Promise resolving when the card is deleted.
   */
  deletePromptCard(userId: string, cardId: string): Promise<void>;

  /**
   * Retrieves a single PromptCard.
   * @param userId The ID of the user.
   * @param cardId The ID of the card.
   * @returns A Promise resolving with the PromptCard or null if not found.
   */
  getPromptCard(userId: string, cardId: string): Promise<PromptCard | null>;

  /**
   * Retrieves all PromptCards for a user.
   * @param userId The ID of the user.
   * @returns A Promise resolving with an array of PromptCards.
   */
  getAllPromptCards(userId: string): Promise<PromptCard[]>;

  /**
   * Exports a single PromptCard for sharing/download.
   * This might involve stripping user-specific metadata like ownerId for public sharing.
   * For now, it simply returns the card, but can be extended.
   * @param userId The ID of the user exporting.
   * @param cardId The ID of the card to export.
   * @returns A Promise resolving with the PromptCard or null.
   */
  exportPromptCard(userId: string, cardId: string): Promise<PromptCard | null>;

  /**
   * Imports PromptCards from a provided list (e.g., from a JSON file).
   * This involves generating new IDs, re-calculating hashes, setting ownerId,
   * and linking lineage appropriately.
   * @param userId The ID of the user importing.
   * @param importedCardsData An array of NewPromptCardData (or similar) from the import source.
   * @returns A Promise resolving with an array of the newly imported PromptCards.
   */
  importPromptCards(userId: string, importedCardsData: NewPromptCardData[]): Promise<PromptCard[]>;
}

/**
 * Concrete implementation of ICardManager.
 */
export class PromptCardManager implements ICardManager {
  constructor(private repo: IPromptCardRepository) {}

  private async buildPromptCard(userId: string, data: NewPromptCardData, existingCard?: PromptCard): Promise<PromptCard> {
    const now = new Date().toISOString();
    let cardId: string;
    let rootId: string;
    let parentId: string | null;
    let createdAt: string;

    if (existingCard) {
      // This path is for updates, or duplicating where we are basing off an existing structure
      cardId = existingCard.id;
      rootId = existingCard.rootId;
      parentId = existingCard.parentId; // Parent ID remains the same for updates
      createdAt = existingCard.createdAt;
    } else {
      // This path is for new creations or imports that need new IDs
      cardId = generateUuid();
      rootId = cardId; // For brand new cards, rootId is its own ID
      parentId = null; // No parent for brand new cards
      createdAt = now;
    }

    // Handle stackInstructions: if provided as string, parse it; otherwise use object or default.
    let parsedStackInstructions: StackInstructions;
    if (typeof data.stackInstructions === 'string') {
      try {
        parsedStackInstructions = JSON.parse(data.stackInstructions);
      } catch (e) {
        errorLog("Error parsing stackInstructions string for new card, falling back to default:", e);
        parsedStackInstructions = defaultStackInstructions;
      }
    } else if (data.stackInstructions) {
      parsedStackInstructions = data.stackInstructions;
    } else {
      parsedStackInstructions = defaultStackInstructions;
    }

    // Construct the card with defaults applied where data is missing
    const tempCard: PromptCard = {
      id: cardId,
      rootId: rootId,
      parentId: parentId,
      ownerId: userId,
      createdAt: createdAt,
      updatedAt: now, // Always update timestamp on creation/modification
      title: data.title,
      prompt: data.prompt,
      description: data.description ?? null,
      firstTurnOnlyBlock: data.firstTurnOnlyBlock ?? DEFAULT_FIRST_TURN_PROMPT_BLOCK,
      stackInstructions: parsedStackInstructions,
      emitSkeleton: data.emitSkeleton ?? DEFAULT_EMIT_SKELETON_STRING,
      worldStateInit: data.worldStateInit ?? "",
      gameRules: data.gameRules ?? "",
      aiSettings: { ...defaultAiSettingsInCard, ...data.aiSettings },
      helperAiSettings: { ...defaultAiSettingsInCard, ...data.helperAiSettings },
      isHelperAiEnabled: data.isHelperAiEnabled ?? false, // NEW: Initialize with default false
      tags: data.tags ?? [],
      isExample: data.isExample ?? false,
      functionDefs: data.functionDefs ?? "",
      isPublic: data.isPublic ?? false, // Default to private for new user-created cards
      contentHash: '', // Will be calculated below
      historyBrowsingEnabled: data.historyBrowsingEnabled ?? true, // <-- ADD THIS (default to true)
    };

    // Calculate content hash AFTER all content fields are finalized
    tempCard.contentHash = generateContentHash(getPromptCardContentForHash(tempCard));

    return tempCard;
  }

  async createNewPromptCard(userId: string, data: NewPromptCardData): Promise<PromptCard> {
    const newCard = await this.buildPromptCard(userId, data);
    await this.repo.savePromptCard(userId, newCard);
    return newCard;
  }

  async updatePromptCard(userId: string, cardId: string, updates: Partial<PromptCard>): Promise<PromptCard | null> {
    const existingCard = await this.repo.getPromptCard(userId, cardId);
    if (!existingCard) {
      return null;
    }

    // Apply updates
    const updatedCardData = { ...existingCard, ...updates };

    // Re-calculate hash based on potentially changed content fields
    const newContentHash = generateContentHash(getPromptCardContentForHash(updatedCardData));
    updatedCardData.contentHash = newContentHash;
    updatedCardData.updatedAt = new Date().toISOString(); // Update timestamp on modification

    await this.repo.savePromptCard(userId, updatedCardData);
    return updatedCardData;
  }

  async duplicatePromptCard(userId: string, sourceCardId: string): Promise<PromptCard | null> {
    const sourceCard = await this.repo.getPromptCard(userId, sourceCardId);
    if (!sourceCard) {
      debugLog(`Source card with ID ${sourceCardId} not found for duplication.`);
      return null;
    }

    const newId = generateUuid();
    const now = new Date().toISOString();

    const duplicatedCard: PromptCard = {
      ...sourceCard, // Copy all existing fields
      id: newId, // Assign new ID
      rootId: sourceCard.rootId, // Root remains the same
      parentId: sourceCard.id, // New parent is the source card
      ownerId: userId, // Ensure new owner is current user
      createdAt: now, // New creation timestamp for the duplicate
      updatedAt: now, // New update timestamp
      isExample: false, // Duplicates are user-owned, not examples
      isPublic: false, // Duplicates are private by default
      // isHelperAiEnabled will be copied correctly from sourceCard by the spread operator
    };

    // Recalculate hash for the duplicated card in case any content fields were implicitly changed
    // (e.g., if a previous source card had an older version of stack instructions that parsed differently).
    // Or just for robustness.
    duplicatedCard.contentHash = generateContentHash(getPromptCardContentForHash(duplicatedCard));

    await this.repo.savePromptCard(userId, duplicatedCard);
    debugLog(`Card ${sourceCardId} duplicated to ${newId}`);
    return duplicatedCard;
  }

  async deletePromptCard(userId: string, cardId: string): Promise<void> {
    await this.repo.deletePromptCard(userId, cardId);
  }

  async getPromptCard(userId: string, cardId: string): Promise<PromptCard | null> {
    return this.repo.getPromptCard(userId, cardId);
  }

  async getAllPromptCards(userId: string): Promise<PromptCard[]> {
    return this.repo.getAllPromptCards(userId);
  }

  async exportPromptCard(userId: string, cardId: string): Promise<PromptCard | null> {
    const card = await this.repo.getPromptCard(userId, cardId);
    if (card) {
      // For export, you might want to strip or transform sensitive/user-specific fields.
      // For MVP, we return the full card.
      // E.g., delete card.ownerId; // if it's meant for public template export
    }
    return card;
  }

  async importPromptCards(userId: string, importedCardsData: NewPromptCardData[]): Promise<PromptCard[]> {
    const importedAndProcessedCards: PromptCard[] = [];
    for (const data of importedCardsData) {
      // For imported cards, we generate a new UUID.
      // The parentId and rootId logic for imports needs careful consideration:
      // If the imported card explicitly defines a lineage, we might keep it.
      // If it's a "fresh" import, its rootId becomes its own new ID, parentId is null.
      // For now, let's treat all imports as new roots by default for simplicity,
      // and re-establish lineage if a more complex import format is defined later.
      // OR, if `NewPromptCardData` from import includes original IDs, we could preserve root/parent
      // For MVP, let's assume they are new root cards.
      const newCard = await this.buildPromptCard(userId, data);
      importedAndProcessedCards.push(newCard);
    }
    await this.repo.importPromptCards(userId, importedAndProcessedCards);
   debugLog(`Imported ${importedAndProcessedCards.length} cards.`);
    return importedAndProcessedCards;
  }
}

// Export a singleton instance of the manager
export const promptCardManager = new PromptCardManager(promptCardRepository);