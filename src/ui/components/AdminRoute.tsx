//src/ui/components/AdminRoute.tsx

import React, { useState, useEffect, type JSX } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../state/useAuthStore';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../data/infrastructure/firebaseClient';
import { Box, CircularProgress, Typography } from '@mui/material';

// This is a simple hook to check the user's role
const useAdminStatus = (userId: string | null) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }
    const checkAdmin = async () => {
      const userDocRef = doc(db, 'users', userId);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists() && userDocSnap.data().role === 'admin') {
        setIsAdmin(true);
      }
      setIsLoading(false);
    };
    checkAdmin();
  }, [userId]);

  return { isAdmin, isLoading };
};

const AdminRoute: React.FC<{ children: JSX.Element }> = ({ children }) => {
  const { user, isLoading: isAuthLoading } = useAuthStore();
  const { isAdmin, isLoading: isAdminLoading } = useAdminStatus(user?.uid || null);

  if (isAuthLoading || isAdminLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
        <Typography ml={2}>Verifying Permissions...</Typography>
      </Box>
    );
  }

  if (!user || !isAdmin) {
    // If not an admin, redirect to the library
    return <Navigate to="/library" replace />;
  }

  return children;
};

export default AdminRoute;