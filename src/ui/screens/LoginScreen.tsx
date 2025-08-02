// src/ui/screens/LoginScreen.tsx
import React from 'react';
import { useAuthStore } from '../../state/useAuthStore';

export default function LoginScreen() {
  const { user, isLoading, error, signIn, signOut } = useAuthStore();

  if (isLoading) return <p>Loading...</p>;

  return (
    <div style={{ padding: '2rem' }}>
      {user ? (
        <>
          <p>Welcome, {user.displayName || 'User'}!</p>
          <button onClick={signOut}>Sign out</button>
        </>
      ) : (
        <>
          {error && <p style={{ color: 'red' }}>{error}</p>}
          <button onClick={signIn}>Sign in with Google</button>
        </>
      )}
    </div>
  );
}

