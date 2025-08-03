// src/data/repositories/gameRepository.ts

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
import { db } from '../infrastructure/firebaseClient';
import { GameSnapshot } from '../../models/GameSnapshot';
import { AiConnection } from '../../models/AiConnection';

/**
 * Defines the contract for GameSnapshot data persistence operations.
 */
export interface IGameRepository {
  /**
   * Saves a new or updates an existing GameSnapshot.
   * @param userId The ID of the user owning the snapshot.
   * @param snapshot The GameSnapshot object to save.
   * @returns A Promise that resolves when the snapshot is successfully saved.
   */
  saveGameSnapshot(userId: string, snapshot: GameSnapshot): Promise<void>;

  /**
   * Retrieves a single GameSnapshot by its ID for a specific user.
   * @param userId The ID of the user owning the snapshot.
   * @param snapshotId The ID of the GameSnapshot to retrieve.
   * @returns A Promise that resolves with the GameSnapshot object or null if not found.
   */
  getGameSnapshot(userId: string, snapshotId: string): Promise<GameSnapshot | null>;

  /**
   * Retrieves all GameSnapshots for a specific user, ordered by updatedAt descending.
   * @param userId The ID of the user owning the snapshots.
   * @returns A Promise that resolves with an array of GameSnapshot objects.
   */
  getAllGameSnapshots(userId: string): Promise<GameSnapshot[]>;

  /**
   * Deletes a GameSnapshot by its ID for a specific user.
   * @param userId The ID of the user owning the snapshot.
   * @param snapshotId The ID of the GameSnapshot to delete.
   * @returns A Promise that resolves when the snapshot is successfully deleted.
   */
  deleteGameSnapshot(userId: string, snapshotId: string): Promise<void>;

  /**
   * Retrieves all AI Connections for a user.
   * For MVP, this might be a static list or a simple Firestore collection.
   * @param userId The ID of the user.
   * @returns A Promise resolving with an array of AiConnection objects.
   */
  getAiConnections(userId: string): Promise<AiConnection[]>;
}

/**
 * Concrete implementation of IGameRepository using Firestore.
 */
class FirestoreGameRepository implements IGameRepository {

  private getSnapshotsCollectionRef(userId: string) {
    // Path: users/{userId}/gameSnapshots
    return collection(db, 'users', userId, 'gameSnapshots');
  }

  private getConnectionsCollectionRef(userId: string) {
    // Path: users/{userId}/aiConnections
    return collection(db, 'users', userId, 'aiConnections');
  }

  async saveGameSnapshot(userId: string, snapshot: GameSnapshot): Promise<void> {
    const snapshotDocRef = doc(this.getSnapshotsCollectionRef(userId), snapshot.id);
    // Use setDoc with merge: true to avoid overwriting on partial updates, though we save the whole object here.
    // It's a good practice.
    await setDoc(snapshotDocRef, {
      ...snapshot,
      updatedAt: serverTimestamp() // Use Firestore's server-side timestamp for accuracy
    }, { merge: true });
    console.log(`GameSnapshot ${snapshot.id} saved for user ${userId}`);
  }

  async getGameSnapshot(userId: string, snapshotId: string): Promise<GameSnapshot | null> {
    const snapshotDocRef = doc(this.getSnapshotsCollectionRef(userId), snapshotId);
    const snapshotSnap = await getDoc(snapshotDocRef);

    if (snapshotSnap.exists()) {
      const data = snapshotSnap.data();
      // Firestore's serverTimestamp() retrieves as a Timestamp object. Convert to ISO string.
      return {
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() ?? data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? data.updatedAt,
      } as GameSnapshot;
    } else {
      console.log(`No GameSnapshot found with ID: ${snapshotId} for user ${userId}`);
      return null;
    }
  }

  async getAllGameSnapshots(userId: string): Promise<GameSnapshot[]> {
    const q = query(
      this.getSnapshotsCollectionRef(userId),
      orderBy('updatedAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    const snapshots: GameSnapshot[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      snapshots.push({
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() ?? data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? data.updatedAt,
      } as GameSnapshot);
    });
    return snapshots;
  }

  async deleteGameSnapshot(userId: string, snapshotId: string): Promise<void> {
    const snapshotDocRef = doc(this.getSnapshotsCollectionRef(userId), snapshotId);
    await deleteDoc(snapshotDocRef);
    console.log(`GameSnapshot ${snapshotId} deleted for user ${userId}`);
  }

  async getAiConnections(userId: string): Promise<AiConnection[]> {
    // For MVP, we can return a static, default list.
    // A full implementation would fetch this from `users/{userId}/aiConnections` in Firestore.
    // This allows users to configure their own API keys and endpoints.
    return [
      {
        id: 'deepseek-coder-default',
        modelName: 'DeepSeek Coder (Default)',
        modelSlug: 'deepseek-coder',
        apiUrl: 'https://api.deepseek.com/v1/',
        apiToken: 'YOUR_DEEPSEEK_API_KEY_HERE', // User should be able to edit this
      },
      // {
      //   id: 'openai-gpt4-default',
      //   modelName: 'OpenAI GPT-4 (Default)',
      //   modelSlug: 'gpt-4-turbo',
      //   apiUrl: 'https://api.openai.com/v1/',
      //   apiToken: 'YOUR_OPENAI_API_KEY_HERE',
      // },
    ];
  }
}

// Export a singleton instance of the repository.
export const gameRepository = new FirestoreGameRepository();