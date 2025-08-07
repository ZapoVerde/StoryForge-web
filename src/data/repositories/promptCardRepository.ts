// src/data/repositories/promptCardRepository.ts

import {
  collection,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  getDocs,
  serverTimestamp,
  orderBy
} from 'firebase/firestore';
import { db } from '../infrastructure/firebaseClient'; // Import our Firestore instance
import type { PromptCard } from '../../models';
import { toIsoStringIfTimestamp } from '../../utils/formatDate';

/**
 * Defines the contract for PromptCard data persistence operations.
 * This interface can be implemented by different concrete repositories
 * (e.g., FirestorePromptCardRepository, MockPromptCardRepository)
 * to allow for easy swapping of data sources.
 */
export interface IPromptCardRepository {
  /**
   * Saves a new or updates an existing PromptCard.
   * If the card already has an ID, it will update the existing document.
   * If not, it assumes the card object passed already has an ID generated (e.g., by cardManager).
   * @param userId The ID of the user owning the card.
   * @param card The PromptCard object to save.
   * @returns A Promise that resolves when the card is successfully saved.
   */
  savePromptCard(userId: string, card: PromptCard): Promise<void>;

  /**
   * Retrieves a single PromptCard by its ID for a specific user.
   * @param userId The ID of the user owning the card.
   * @param cardId The ID of the PromptCard to retrieve.
   * @returns A Promise that resolves with the PromptCard object or null if not found.
   */
  getPromptCard(userId: string, cardId: string): Promise<PromptCard | null>;

  /**
   * Retrieves all PromptCards for a specific user, ordered by updatedAt descending.
   * @param userId The ID of the user owning the cards.
   * @returns A Promise that resolves with an array of PromptCard objects.
   */
  getAllPromptCards(userId: string): Promise<PromptCard[]>;

  /**
   * Deletes a PromptCard by its ID for a specific user.
   * @param userId The ID of the user owning the card.
   * @param cardId The ID of the PromptCard to delete.
   * @returns A Promise that resolves when the card is successfully deleted.
   */
  deletePromptCard(userId: string, cardId: string): Promise<void>;

  /**
   * Imports a collection of PromptCards. This method will likely involve
   * generating new IDs/hashes and setting ownerId upon import.
   * The actual logic for generating IDs/hashes and setting ownerId should be in cardManager.ts,
   * this repository method merely handles the bulk persistence.
   * @param userId The ID of the user importing the cards.
   * @param cards The array of PromptCard objects to import.
   * @returns A Promise that resolves when all cards are imported.
   */
  importPromptCards(userId: string, cards: PromptCard[]): Promise<void>;
}

/**
 * Concrete implementation of IPromptCardRepository using Firestore.
 */
export class FirestorePromptCardRepository implements IPromptCardRepository {

  private getCollectionRef(userId: string) {
    // Path: users/{userId}/promptCards
    return collection(db, 'users', userId, 'promptCards');
  }

  async savePromptCard(userId: string, card: PromptCard): Promise<void> {
    if (!card.id) {
      // This case should ideally be prevented by logic in cardManager or wherever cards are created
      // as PromptCard should always have an ID before reaching the repository.
      throw new Error("PromptCard must have an ID to be saved.");
    }
    const cardDocRef = doc(this.getCollectionRef(userId), card.id);
    await setDoc(cardDocRef, {
      ...card,
      updatedAt: serverTimestamp() // Firestore special value for server timestamp
    }, { merge: true }); // Use merge: true to update existing fields and add new ones without overwriting entire doc
    // Note: createdAt should only be set on initial creation, not on every update.
    // We'll manage createdAt in cardManager.ts before passing to repository.
    console.log(`PromptCard ${card.id} saved for user ${userId}`);
  }

  async getPromptCard(userId: string, cardId: string): Promise<PromptCard | null> {
    const cardDocRef = doc(this.getCollectionRef(userId), cardId);
    const cardSnap = await getDoc(cardDocRef);

    if (cardSnap.exists()) {
      // Firestore `data()` method returns `any`. We cast it to PromptCard.
      // Note: serverTimestamp() will be an object like { seconds: ..., nanoseconds: ... }
      // when retrieved, not an ISO string. We might need a conversion layer if UI strictly expects ISO string.
      // However, Firestore handles this transparently for objects if saving back.
      // For display, formatIsoDateForDisplay will handle it correctly if it's Date or Timestamp object.
      const data = cardSnap.data() as PromptCard;

      // Firestore's serverTimestamp() retrieves as a Timestamp object.
      // To ensure our PromptCard interface holds string (ISO 8601), we convert it here.
      // This is a common pattern: store one way, retrieve/convert to match app's type.
      return {
        ...data,
        createdAt: toIsoStringIfTimestamp(data.createdAt),
        updatedAt: toIsoStringIfTimestamp(data.updatedAt),
      };
    } else {
      console.log(`No PromptCard found with ID: ${cardId} for user ${userId}`);
      return null;
    }
  }

  async getAllPromptCards(userId: string): Promise<PromptCard[]> {
    const q = query(
      this.getCollectionRef(userId),
      orderBy('updatedAt', 'desc') // Order by last updated, newest first
    );
    const querySnapshot = await getDocs(q);
    const cards: PromptCard[] = [];
    querySnapshot.forEach((doc) => {
      // Same conversion for Timestamp objects as in getPromptCard
      const data = doc.data() as PromptCard;
      cards.push({
        ...data,
        createdAt: toIsoStringIfTimestamp(data.createdAt),
        updatedAt: toIsoStringIfTimestamp(data.updatedAt),
      });
    });
    console.log(`Retrieved ${cards.length} prompt cards for user ${userId}`);
    return cards;
  }

  async deletePromptCard(userId: string, cardId: string): Promise<void> {
    const cardDocRef = doc(this.getCollectionRef(userId), cardId);
    await deleteDoc(cardDocRef);
    console.log(`PromptCard ${cardId} deleted for user ${userId}`);
  }

  async importPromptCards(userId: string, cards: PromptCard[]): Promise<void> {
    // Firestore transactions/batch writes are ideal for bulk operations.
    // For simplicity in MVP, we'll do individual setDoc calls in parallel.
    // A more robust solution might use writeBatch for atomicity.
    const importPromises = cards.map(async (card) => {
      // Assume cardManager has already processed these cards for import (new IDs, hashes, ownerId).
      const cardDocRef = doc(this.getCollectionRef(userId), card.id);
      await setDoc(cardDocRef, {
        ...card,
        // Ensure timestamps are correctly handled for imported cards.
        // If the imported card already has createdAt/updatedAt, use them.
        // Otherwise, serverTimestamp() is an option, but for imports,
        // it's often preferred to preserve original times or set a specific import time.
        // For now, assume the card object already has string ISO timestamps set by cardManager.
      });
    });
    await Promise.all(importPromises);
    console.log(`Successfully imported ${cards.length} prompt cards for user ${userId}`);
  }
}

// Export a singleton instance of the repository for use throughout the application
export const promptCardRepository = new FirestorePromptCardRepository();