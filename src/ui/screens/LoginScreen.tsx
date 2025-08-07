import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // Add this
import { useAuthStore } from '../../state/useAuthStore';

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#f0f2f5',
    fontFamily: 'Arial, sans-serif',
    padding: '20px',
  },
  button: {
    padding: '10px 20px',
    fontSize: '16px',
    backgroundColor: '#4285F4',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    marginTop: '20px',
    transition: 'background-color 0.3s ease',
  },
  errorText: {
    color: 'red',
    marginTop: '10px',
  },
};


const LoginScreen: React.FC = () => {
  const { user, isLoading, error, signIn, signOut } = useAuthStore();
  const navigate = useNavigate(); // Add this

  // ✅ Redirect out of login screen if user is authenticated
  useEffect(() => {
    if (user) {
      navigate('/library', { replace: true });
    }
  }, [user, navigate]);

  if (isLoading) {
    return (
      <div style={styles.container}>
        <h2>Loading Authentication Status...</h2>
      </div>
    );
  }

  if (user) {
    return (
      <div style={styles.container}>
        <h2>Welcome, {user.displayName || user.email}!</h2>
        <p>Your User ID: {user.uid}</p>
        <button onClick={signOut} style={styles.button}>
          Sign Out
        </button>
      </div>
    );
  } else {
    return (
      <div style={styles.container}>
        <h2>Please Log In to StoryForge</h2>
        {error && <p style={styles.errorText}>Error: {error}</p>}
        <button onClick={signIn} style={styles.button}>
          Sign in with Google
        </button>
      </div>
    );
  }
};
export default LoginScreen;