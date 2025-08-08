// src/data/repositories/gameRepository.ts

import {
  collection, doc, getDoc, setDoc, deleteDoc, query, getDocs,
  serverTimestamp, orderBy, Timestamp, where, writeBatch
} from 'firebase/firestore';
import { db } from '../infrastructure/firebaseClient';
import type { GameSnapshot } from '../../models';

/**
 * Defines the contract for GameSnapshot data persistence operations.
 */
export interface IGameRepository {
  saveGameSnapshot(userId: string, snapshot: GameSnapshot): Promise<void>;
  getGameSnapshot(userId: string, snapshotId: string): Promise<GameSnapshot | null>;
  getAllGameSnapshots(userId: string): Promise<GameSnapshot[]>;
  deleteGameSnapshot(userId: string, snapshotId: string): Promise<void>;
  getGameTimeline(userId: string, gameId: string): Promise<GameSnapshot[]>;
  deleteFutureTurns(userId: string, gameId: string, fromTurn: number): Promise<void>;
}

/**
 * Concrete implementation of IGameRepository using Firestore.
 */
class FirestoreGameRepository implements IGameRepository {
  private getSnapshotsCollectionRef(userId: string) {
    return collection(db, 'users', userId, 'gameSnapshots');
  }

  // Helper to convert Firestore Timestamp to ISO string
  private convertTimestamps<T extends { createdAt?: any; updatedAt?: any }>(data: any): T {
    const convertedData: any = { ...data };
    if (data.createdAt && data.createdAt instanceof Timestamp) {
      convertedData.createdAt = data.createdAt.toDate().toISOString();
    }
    if (data.updatedAt && data.updatedAt instanceof Timestamp) {
      convertedData.updatedAt = data.updatedAt.toDate().toISOString();
    }
    return convertedData as T;
  }

  async saveGameSnapshot(userId: string, snapshot: GameSnapshot): Promise<void> {
    const snapshotDocRef = doc(this.getSnapshotsCollectionRef(userId), snapshot.id);
    try {
      await setDoc(snapshotDocRef, {
        ...snapshot,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (e) {
      console.error(`FirestoreGameRepository: FAILED to setDoc for GameSnapshot ${snapshot.id}:`, e);
      throw e;
    }
  }

  async getGameSnapshot(userId: string, snapshotId: string): Promise<GameSnapshot | null> {
    const snapshotDocRef = doc(this.getSnapshotsCollectionRef(userId), snapshotId);
    const snapshotSnap = await getDoc(snapshotDocRef);
    if (snapshotSnap.exists()) {
      return this.convertTimestamps<GameSnapshot>(snapshotSnap.data()) as GameSnapshot;
    } else {
      return null;
    }
  }

  async getAllGameSnapshots(userId: string): Promise<GameSnapshot[]> {
    const q = query(this.getSnapshotsCollectionRef(userId), orderBy('updatedAt', 'desc'));
    const querySnapshot = await getDocs(q);
    const snapshots: GameSnapshot[] = [];
    querySnapshot.forEach((doc) => {
      snapshots.push(this.convertTimestamps<GameSnapshot>(doc.data()) as GameSnapshot);
    });
    return snapshots;
  }

  async deleteGameSnapshot(userId: string, snapshotId: string): Promise<void> {
    const snapshotDocRef = doc(this.getSnapshotsCollectionRef(userId), snapshotId);
    await deleteDoc(snapshotDocRef);
  }

  async getGameTimeline(userId: string, gameId: string): Promise<GameSnapshot[]> {
    const q = query(
      this.getSnapshotsCollectionRef(userId),
      where('gameId', '==', gameId),
      orderBy('currentTurn', 'asc')
    );
    const querySnapshot = await getDocs(q);
    const timeline: GameSnapshot[] = [];
    querySnapshot.forEach((doc) => {
      timeline.push(this.convertTimestamps<GameSnapshot>(doc.data()) as GameSnapshot);
    });
    return timeline;
  }

  async deleteFutureTurns(userId: string, gameId: string, fromTurn: number): Promise<void> {
    const q = query(
      this.getSnapshotsCollectionRef(userId),
      where('gameId', '==', gameId),
      where('currentTurn', '>', fromTurn)
    );
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return;
    const batch = writeBatch(db);
    querySnapshot.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  }
}

export const gameRepository = new FirestoreGameRepository();