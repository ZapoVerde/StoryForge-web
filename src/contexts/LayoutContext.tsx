// src/contexts/LayoutContext.tsx
import React, { createContext, useContext, useState } from 'react';

interface LayoutContextType {
  toggleDrawer: () => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export const useLayout = () => {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error('useLayout must be used within a LayoutProvider');
  }
  return context;
};

export const LayoutProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const toggleDrawer = () => setMobileOpen(!mobileOpen);

  const value = { toggleDrawer, mobileOpen }; // Provide mobileOpen as well if needed by MainLayout

  // The actual provider component will be part of MainLayout to have access to state
  // This file just defines the context and hook. The implementation will be in MainLayout.
  // This is a common pattern to avoid circular dependencies.
  // For this refactor, we will define the Provider logic directly within MainLayout.
  return (
    <LayoutContext.Provider value={{ toggleDrawer }}>
      {children}
    </LayoutContext.Provider>
  );
};