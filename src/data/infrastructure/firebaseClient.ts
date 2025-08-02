// src/data/firebaseClient.ts
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

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

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
// Get Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);

// Enable Firestore offline persistence
// This allows the app to work offline and sync data when online.
// It should be called once, after initializing Firestore.
// Note: This might cause an error in React StrictMode if not handled carefully,
// as StrictMode renders components twice. A try-catch block is good practice.
try {
  enableIndexedDbPersistence(db)
    .then(() => {
      console.log("Firestore offline persistence enabled.");
    })
    .catch((err) => {
      if (err.code === 'failed-precondition') {
        // Multiple tabs open, persistence can only be enabled in one.
        console.warn("Firestore persistence could not be enabled (multiple tabs open or already enabled):", err.message);
      } else if (err.code === 'unimplemented') {
        // The current browser does not support all of the
        // features required to enable persistence.
        console.warn("Firestore persistence not supported by browser:", err.message);
      } else {
        console.error("Error enabling Firestore persistence:", err);
      }
    });
} catch (e) {
  console.error("Error calling enableIndexedDbPersistence:", e);
}


// You can add other services here if needed later, e.g.,
// export const storage = getStorage(app);