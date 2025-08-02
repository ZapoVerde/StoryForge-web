// src/state/useAuthStore.ts
import { create } from 'zustand';
import type { User } from 'firebase/auth';
import { signInWithGoogle, signOutUser, subscribeToAuthChanges } from '../data/authRepository';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  setUser: (user: User | null) => void;
  setError: (error: string | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  error: null,
  signIn: async () => {
    try {
      set({ isLoading: true, error: null });
      const user = await signInWithGoogle();
      set({ user });
    } catch (err: any) {
      set({ error: err.message || 'Sign-in failed' });
    } finally {
      set({ isLoading: false });
    }
  },
  signOut: async () => {
    try {
      set({ isLoading: true, error: null });
      await signOutUser();
      set({ user: null });
    } catch (err: any) {
      set({ error: err.message || 'Sign-out failed' });
    } finally {
      set({ isLoading: false });
    }
  },
  setUser: (user) => set({ user }),
  setError: (error) => set({ error }),
}));

// Automatically keep store in sync with Firebase Auth
subscribeToAuthChanges((user) => {
  useAuthStore.getState().setUser(user);
});
