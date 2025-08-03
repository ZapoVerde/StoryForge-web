// src/data/firebaseClient.ts

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  // Removed deprecated enableIndexedDbPersistence
  initializeFirestore, // Use this for custom settings before any other Firestore call
  PersistentLocalCache, // New import for the recommended local cache
} from 'firebase/firestore';

// Your Firebase configuration
// IMPORTANT: Replace with your actual Firebase project configuration
// You can find this in your Firebase project settings -> Project settings -> General -> Your apps -> Web app
function getEnvVar(name: string): string {
  const value = import.meta.env[name] as string | undefined;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const firebaseConfig = {
  apiKey: getEnvVar('VITE_FIREBASE_API_KEY'),
  authDomain: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: getEnvVar('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: getEnvVar('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnvVar('VITE_FIREBASE_APP_ID'),
};

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with persistent cache
// This must be done BEFORE getFirestore() if it's the first Firestore instance created.
// Use try-catch for strict mode or multiple initializations, similar to the old persistence method.
let firestoreInstance;
try {
  firestoreInstance = initializeFirestore(app, {
    localCache: PersistentLocalCache.getEmptyCache(),
  });
  console.log("Firestore persistent local cache initialized.");
} catch (e: any) {
  // Check for 'already-exists' error if initializeFirestore is called multiple times
  if (e.code === 'already-exists') {
    firestoreInstance = getFirestore(app); // Get the existing instance
    console.warn("Firestore was already initialized. Using existing instance.", e.message);
  } else {
    // Other errors, e.g., browser not supporting persistence or other initialization issues
    firestoreInstance = getFirestore(app); // Fallback to non-persistent if persistent fails
    console.error("Error initializing Firestore with persistent cache, falling back to non-persistent:", e);
    // You might want to notify the user about offline limitations here.
  }
}
export const db = firestoreInstance; // Export the initialized Firestore instance


// Get Firebase services
export const auth = getAuth(app);

// You can add other services here if needed later, e.g.,
// export const storage = getStorage(app);