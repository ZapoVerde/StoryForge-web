// src/utils/hooks/useSettingsLogic.ts
import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../../state/useAuthStore';
import { useSettingsStore } from '../../state/useSettingsStore';
import { AiConnection } from '../../models/AiConnection';
import { aiClient } from '../../logic/aiClient';

export const useSettingsLogic = () => {
  const { user } = useAuthStore();
  const settingsStore = useSettingsStore();

  // 1. Local UI State
  const [editingConnection, setEditingConnection] = useState<AiConnection | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }>({ open: false, message: '', severity: 'info' });

  // 2. Data Fetching Effect
  useEffect(() => {
    if (user?.uid) {
      settingsStore.fetchAiConnections(user.uid);
    }
  }, [user?.uid, settingsStore.fetchAiConnections]);

  // 3. Handlers and Callbacks
  const showSnackbar = useCallback((message: string, severity: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const handleOpenDialog = useCallback((connection: AiConnection | null) => {
    setTestStatus(null);
    if (connection) {
      // Editing existing connection
      setEditingConnection({ ...connection });
    } else {
      // Adding a new connection
      setEditingConnection({
        id: '', // Will be generated in the store action
        displayName: '',
        apiUrl: '',
        apiToken: '',
        modelName: '',
        modelSlug: '',
        functionCallingEnabled: false,
        userAgent: 'StoryForge/1.0 (Web)',
        createdAt: '',
        lastUpdated: '',
      });
    }
    setIsDialogOpen(true);
  }, []);

  const handleCloseDialog = useCallback(() => {
    setIsDialogOpen(false);
    setEditingConnection(null);
  }, []);

  const handleUpdateEditingConnection = useCallback((updates: Partial<AiConnection>) => {
    if (editingConnection) {
      setEditingConnection(prev => ({ ...prev!, ...updates }));
    }
  }, [editingConnection]);

  const handleSave = useCallback(async () => {
    if (!user?.uid || !editingConnection) return;
    try {
      if (editingConnection.id) {
        await settingsStore.updateAiConnection(user.uid, editingConnection);
        showSnackbar('Connection updated successfully!', 'success');
      } else {
        await settingsStore.addAiConnection(user.uid, editingConnection);
        showSnackbar('Connection added successfully!', 'success');
      }
      handleCloseDialog();
    } catch (e) {
      showSnackbar(`Failed to save connection: ${e instanceof Error ? e.message : 'Unknown error'}`, 'error');
    }
  }, [user, editingConnection, settingsStore, showSnackbar, handleCloseDialog]);

  const handleDelete = useCallback(async (connectionId: string) => {
    if (!user?.uid) return;
    await settingsStore.deleteAiConnection(user.uid, connectionId);
    showSnackbar('Connection deleted successfully!', 'success');
  }, [user, settingsStore, showSnackbar]);

  const handleTest = useCallback(async () => {
    if (!editingConnection) return;
    setTestStatus('Testing...');
    const success = await aiClient.testConnection(editingConnection);
    if (success) {
      setTestStatus('✅ Success!');
    } else {
      setTestStatus('❌ Failed. Check URL, Token, and Model Slug.');
    }
  }, [editingConnection]);

  const closeSnackbar = useCallback(() => {
    setSnackbar(prev => ({ ...prev, open: false }));
  }, []);


  // 4. Return Clean API
  return {
    // Global State from Store
    ...settingsStore,

    // Local UI State
    isDialogOpen,
    editingConnection,
    testStatus,
    snackbar,

    // Handlers
    handleOpenDialog,
    handleCloseDialog,
    handleUpdateEditingConnection,
    handleSave,
    handleDelete,
    handleTest,
    closeSnackbar,
  };
};