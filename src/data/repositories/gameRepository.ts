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
  orderBy,
  Timestamp, // Import Timestamp type
} from 'firebase/firestore';
import { db } from '../infrastructure/firebaseClient';
import { GameSnapshot } from '../../models/GameSnapshot';
import { AiConnection } from '../../models/AiConnection';
import { generateUuid } from '../../utils/uuid'; // Import generateUuid

/**
 * Defines the contract for GameSnapshot and AiConnection data persistence operations.
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
   * @param userId The ID of the user.
   * @returns A Promise resolving with an array of AiConnection objects.
   */
  getAiConnections(userId: string): Promise<AiConnection[]>;

  /**
   * Saves a new or updates an existing AI Connection.
   * @param userId The ID of the user.
   * @param connection The AiConnection object to save.
   * @returns A Promise that resolves when the connection is successfully saved.
   */
  saveAiConnection(userId: string, connection: AiConnection): Promise<void>;

  /**
   * Deletes an AI Connection by its ID for a specific user.
   * @param userId The ID of the user.
   * @param connectionId The ID of the AiConnection to delete.
   * @returns A Promise that resolves when the connection is successfully deleted.
   */
  deleteAiConnection(userId: string, connectionId: string): Promise<void>;
}

/**
 * Concrete implementation of IGameRepository using Firestore.
 */
class FirestoreGameRepository implements IGameRepository {

  private getSnapshotsCollectionRef(userId: string) {
    // Path: users/{userId}/gameSnapshots
    return collection(db, 'users', userId, 'gameSnapshots');
  }

  private getAiConnectionsCollectionRef(userId: string) {
    // Path: users/{userId}/aiConnections
    return collection(db, 'users', userId, 'aiConnections');
  }

  // Helper to convert Firestore Timestamp to ISO string
  private convertTimestamps<T extends { createdAt?: string | Timestamp; updatedAt?: string | Timestamp; lastUpdated?: string | Timestamp }>(data: any): T {
    return {
      ...data,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
      updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt,
      lastUpdated: data.lastUpdated instanceof Timestamp ? data.lastUpdated.toDate().toISOString() : data.lastUpdated,
    } as T;
  }

  async saveGameSnapshot(userId: string, snapshot: GameSnapshot): Promise<void> {
    const snapshotDocRef = doc(this.getSnapshotsCollectionRef(userId), snapshot.id);
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
      return this.convertTimestamps<GameSnapshot>(data);
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
      snapshots.push(this.convertTimestamps<GameSnapshot>(doc.data()));
    });
    return snapshots;
  }

  async deleteGameSnapshot(userId: string, snapshotId: string): Promise<void> {
    const snapshotDocRef = doc(this.getSnapshotsCollectionRef(userId), snapshotId);
    await deleteDoc(snapshotDocRef);
    console.log(`GameSnapshot ${snapshotId} deleted for user ${userId}`);
  }

  async getAiConnections(userId: string): Promise<AiConnection[]> {
    const q = query(
      this.getAiConnectionsCollectionRef(userId),
      orderBy('displayName', 'asc') // Order by display name
    );
    const querySnapshot = await getDocs(q);
    const connections: AiConnection[] = [];
    querySnapshot.forEach((docSnap) => {
      // Ensure the ID from the document is used
      connections.push(this.convertTimestamps<AiConnection>(docSnap.data()));
    });

    // Provide a default DeepSeek connection if no connections exist for the user.
    // This allows immediate testing without requiring users to manually add one.
    if (connections.length === 0) {
      console.log("No AI connections found, returning default.");
      return [
        {
          id: generateUuid(), // Use a generated UUID for the default
          displayName: 'DeepSeek Coder (Default)', // Added displayName
          modelName: 'DeepSeek Coder (Default)',
          modelSlug: 'deepseek-coder',
          apiUrl: 'https://api.deepseek.com/v1/',
          apiToken: 'YOUR_DEEPSEEK_API_KEY_HERE', // User should be able to edit this
          functionCallingEnabled: false, // Default value
          createdAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
          userAgent: 'StoryForge/1.0 (Default)'
        },
      ];
    }
    return connections;
  }

  async saveAiConnection(userId: string, connection: AiConnection): Promise<void> {
    const connectionDocRef = doc(this.getAiConnectionsCollectionRef(userId), connection.id);
    await setDoc(connectionDocRef, {
      ...connection,
      createdAt: connection.createdAt || serverTimestamp(), // Set createdAt only on initial creation
      lastUpdated: serverTimestamp(), // Always update lastUpdated
    }, { merge: true });
    console.log(`AI Connection ${connection.id} saved for user ${userId}`);
  }

  async deleteAiConnection(userId: string, connectionId: string): Promise<void> {
    const connectionDocRef = doc(this.getAiConnectionsCollectionRef(userId), connectionId);
    await deleteDoc(connectionDocRef);
    console.log(`AI Connection ${connectionId} deleted for user ${userId}`);
  }
}

// Export a singleton instance of the repository.
export const gameRepository = new FirestoreGameRepository();