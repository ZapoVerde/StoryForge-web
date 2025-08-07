// src/state/useAuthStore.ts

import { create } from 'zustand';
import { type User } from 'firebase/auth'; // Import Firebase User type
import { subscribeToAuthChanges, signInWithGoogle, signOutUser } from '../data/repositories/authRepository'; // Import auth functions

// Define the shape of our authentication state
interface AuthState {
  user: User | null; // The current authenticated user or null
  isLoading: boolean; // True while checking initial auth state
  error: string | null; // Any error during auth operations

  // Actions
  // These are not directly implemented here, but exposed for components to call
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

// Create the Zustand store
export const useAuthStore = create<AuthState>((set, get) => ({
  user: null, // Initial state: no user
  isLoading: true, // Initially loading to check auth state
  error: null, // No error initially

  // Action to handle sign-in
  signIn: async () => {
    console.log('[useAuthStore.ts] signIn action called.');
    set({ error: null }); // Clear previous errors
    try {
      await signInWithGoogle();
      // The onAuthStateChanged listener will update the 'user' state,
      // so we don't need to manually set it here based on the signIn result.
    } catch (err: any) {
      console.error("[useAuthStore.ts] AuthStore signIn error:", err);
      set({ error: err.message || "Failed to sign in." });
    }
  },

  // Action to handle sign-out
  signOut: async () => {
    console.log('[useAuthStore.ts] signOut action called.');
    set({ error: null }); // Clear previous errors
    try {
      await signOutUser();
    } catch (err: any) {
      console.error("[useAuthStore.ts] AuthStore signOut error:", err);
      set({ error: err.message || "Failed to sign out." });
    }
  },
}));

// --- Initialize and Subscribe to Auth Changes ---
// This part ensures our store's 'user' state is always in sync with Firebase Auth.
// It runs only once when the module is loaded.
const unsubscribe = subscribeToAuthChanges((user) => {
  // DEBUG: Log exact auth state updates
  useAuthStore.setState({ user: user, isLoading: false });
  console.log(`%c[useAuthStore.ts] Auth State Updated: ${user ? user.uid : "No user"}, IsLoading: false`, 'color: brown;');
});

// Optional: You might want to handle unsubscription if your app could unmount this module,
// but for a core global store, it often lives for the app's lifetime.
// If you were to integrate this into a React component's useEffect, you'd return the unsubscribe function.
// For a global store, we typically let it live.