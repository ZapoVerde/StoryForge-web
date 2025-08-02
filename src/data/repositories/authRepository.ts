// src/data/authRepository.ts

import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { auth } from '../infrastructure/firebaseClient'; // Import the auth instance from our firebaseClient

/**
 * Handles user login using Google as the authentication provider.
 * @returns A Promise that resolves with the Firebase User credential if successful, or rejects with an error.
 */
export async function signInWithGoogle(): Promise<User | null> {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    // The signed-in user info.
    const user = result.user;
    console.log("User logged in:", user.uid);
    return user;
  } catch (error: any) {
    // Handle Errors here.
    const errorCode = error.code;
    const errorMessage = error.message;
    // The email of the user's account used.
    const email = error.customData?.email;
    // The AuthCredential type that was used.
    const credential = GoogleAuthProvider.credentialFromError(error);
    console.error("Error signing in with Google:", errorCode, errorMessage, email, credential);
    throw error; // Re-throw the error for the UI to handle
  }
}

/**
 * Handles user logout.
 * @returns A Promise that resolves when the user is successfully signed out.
 */
export async function signOutUser(): Promise<void> {
  try {
    await signOut(auth);
    console.log("User signed out.");
  } catch (error) {
    console.error("Error signing out:", error);
    throw error; // Re-throw the error for the UI to handle
  }
}

/**
 * Subscribes to authentication state changes.
 * This is crucial for keeping the UI updated about the current user's login status.
 * @param callback A function to call when the auth state changes, receiving the current Firebase User or null.
 * @returns An unsubscribe function that can be called to stop listening for changes.
 */
export function subscribeToAuthChanges(callback: (user: User | null) => void): () => void {
  // onAuthStateChanged returns an unsubscribe function
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    callback(user);
  });
  console.log("Auth state change listener attached.");
  return unsubscribe;
}

// Optional: You could also add a way to get the current user synchronously if needed,
// though `subscribeToAuthChanges` is generally preferred for reactivity.
export function getCurrentUser(): User | null {
  return auth.currentUser;
}