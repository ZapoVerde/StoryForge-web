// src/data/repositories/aiConnectionRepository.ts

import {
    collection, doc, setDoc, deleteDoc, query, getDocs,
    serverTimestamp, orderBy, Timestamp
  } from 'firebase/firestore';
  import { db } from '../infrastructure/firebaseClient';
  import { generateUuid } from '../../utils/uuid';
  import type { AiConnection } from '../../models';
  
  // Helper to convert Firestore Timestamp to ISO string
  const convertTimestamps = <T extends { createdAt?: any; lastUpdated?: any }>(data: any): T => {
    const convertedData: any = { ...data };
    if (data.createdAt && data.createdAt instanceof Timestamp) {
      convertedData.createdAt = data.createdAt.toDate().toISOString();
    }
    if (data.lastUpdated && data.lastUpdated instanceof Timestamp) {
      convertedData.lastUpdated = data.lastUpdated.toDate().toISOString();
    }
    return convertedData as T;
  };
  
  export interface IAiConnectionRepository {
    getAiConnections(userId: string): Promise<AiConnection[]>;
    saveAiConnection(userId: string, connection: AiConnection): Promise<void>;
    deleteAiConnection(userId: string, connectionId: string): Promise<void>;
  }
  
  class FirestoreAiConnectionRepository implements IAiConnectionRepository {
    private getAiConnectionsCollectionRef(userId: string) {
      return collection(db, 'users', userId, 'aiConnections');
    }
  
    async getAiConnections(userId: string): Promise<AiConnection[]> {
      const q = query(
        this.getAiConnectionsCollectionRef(userId),
        orderBy('displayName', 'asc')
      );
      const querySnapshot = await getDocs(q);
      const connections: AiConnection[] = [];
      querySnapshot.forEach((docSnap) => {
        connections.push(convertTimestamps<AiConnection>(docSnap.data()));
      });
      return connections;
    }
  
    async saveAiConnection(userId: string, connection: AiConnection): Promise<void> {
      const connectionDocRef = doc(this.getAiConnectionsCollectionRef(userId), connection.id);
      await setDoc(connectionDocRef, {
        ...connection,
        createdAt: connection.createdAt || serverTimestamp(),
        lastUpdated: serverTimestamp(),
      }, { merge: true });
      console.log(`AI Connection ${connection.id} saved for user ${userId}`);
    }
  
    async deleteAiConnection(userId: string, connectionId: string): Promise<void> {
      const connectionDocRef = doc(this.getAiConnectionsCollectionRef(userId), connectionId);
      await deleteDoc(connectionDocRef);
      console.log(`AI Connection ${connectionId} deleted for user ${userId}`);
    }
  }
  
  export const aiConnectionRepository = new FirestoreAiConnectionRepository();