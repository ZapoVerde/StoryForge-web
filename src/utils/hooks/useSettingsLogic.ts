// src/utils/hooks/useSettingsLogic.ts
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuthStore } from '../../state/useAuthStore';
import { useSettingsStore } from '../../state/useSettingsStore';
import type { AiConnection } from '../../models';
import { aiClient } from '../../logic/aiClient';
import { aiConnectionTemplates } from '../../data/config/aiConnectionTemplates'; // runtime
import type { ModelInfo } from '../../data/config/aiConnectionTemplates'; // type-only

export const useSettingsLogic = () => {
  const { user } = useAuthStore();
  const settingsStore = useSettingsStore();

  const [dialogStep, setDialogStep] = useState<'select' | 'details'>('select');
  const [editingConnection, setEditingConnection] = useState<AiConnection | null>(null);
  const [availableModels, setAvailableModels] = useState<ModelInfo[]>([]);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [modelSearchTerm, setModelSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [testStatus, setTestStatus] = useState<{ text: string, type: 'success' | 'error' | 'info' } | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }>({ open: false, message: '', severity: 'info' });

  useEffect(() => {
    if (user?.uid) {
      settingsStore.fetchAiConnections(user.uid);
    }
  }, [user?.uid, settingsStore.fetchAiConnections]);

  const showSnackbar = useCallback((message: string, severity: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const handleOpenDialog = useCallback((connection?: AiConnection) => {
    setDialogStep(connection ? 'details' : 'select');
    setEditingConnection(connection ? { ...connection } : null);
    
    const templateKey = connection ? Object.keys(aiConnectionTemplates).find(k => aiConnectionTemplates[k].displayName === connection.displayName) : undefined;
    const initialModels = templateKey ? aiConnectionTemplates[templateKey].commonModels : (connection ? [{ id: connection.modelSlug, name: connection.modelName }] : []);
    
    setAvailableModels(initialModels);
    setModelSearchTerm('');
    setTestStatus(null);
    setIsDialogOpen(true);
  }, []);

  const handleLoadTemplate = useCallback((templateKey: string) => {
    const template = aiConnectionTemplates[templateKey] || {
        displayName: 'Custom', modelName: '', modelSlug: '', apiUrl: '', apiToken: '', functionCallingEnabled: false,
        userAgent: 'StoryForge/1.0', supportsModelDiscovery: false, commonModels: [],
    };
    setEditingConnection({
      ...(template as AiConnection),
      id: '', createdAt: '', lastUpdated: '',
    });
    setAvailableModels(template.commonModels);
    setModelSearchTerm('');
    setDialogStep('details');
  }, []);

  const handleFetchModels = useCallback(async () => {
    if (!editingConnection?.apiToken || editingConnection.apiToken.includes('PASTE')) {
      showSnackbar("Please enter a valid API key first.", "warning");
      return;
    }
    setIsFetchingModels(true);
    setTestStatus({ text: "Fetching models...", type: "info" });
    try {
      const models = await aiClient.listModels(editingConnection);
      setAvailableModels(models);
      setTestStatus({ text: `Success! Found ${models.length} models.`, type: "success" });
    } catch (error) {
      setTestStatus({ text: "Failed to fetch models. Check API Key and URL.", type: "error" });
    } finally {
      setIsFetchingModels(false);
    }
  }, [editingConnection, showSnackbar]);

  const filteredModels = useMemo(() => {
    if (!modelSearchTerm) {
      return availableModels;
    }
    const lowercasedFilter = modelSearchTerm.toLowerCase();
    return availableModels.filter(model =>
      model.name.toLowerCase().includes(lowercasedFilter) ||
      model.id.toLowerCase().includes(lowercasedFilter)
    );
  }, [availableModels, modelSearchTerm]);

  const handleCloseDialog = useCallback(() => {
    setIsDialogOpen(false);
  }, []);

  const handleUpdateEditingConnection = useCallback((updates: Partial<AiConnection>) => {
    setEditingConnection(prev => prev ? ({ ...prev, ...updates }) : null);
  }, []);

  const handleTest = useCallback(async () => {
    if (!editingConnection) return;
    setTestStatus({ text: 'Testing...', type: 'info' });
    const result = await aiClient.testConnection(editingConnection);
    if (result.success) {
      setTestStatus({ text: `✅ ${result.message}`, type: 'success' });
    } else {
      setTestStatus({ text: result.message, type: 'error' });
    }
  }, [editingConnection]);

  const handleSaveAndTest = useCallback(async () => {
    if (!user?.uid || !editingConnection) return;
    try {
      let savedConn: AiConnection | null;
      if (editingConnection.id) {
        savedConn = await settingsStore.updateAiConnection(user.uid, editingConnection);
        showSnackbar('Connection updated.', 'success');
      } else {
        savedConn = await settingsStore.addAiConnection(user.uid, editingConnection);
        showSnackbar('Connection added.', 'success');
      }
      
      if (savedConn) {
        setEditingConnection(savedConn);
        await handleTest();
      }
    } catch (e) {
      showSnackbar(`Failed to save: ${e instanceof Error ? e.message : 'Unknown error'}`, 'error');
    }
  }, [user, editingConnection, settingsStore, showSnackbar, handleTest]);

  const handleDelete = useCallback(async (connectionId: string) => {
    if (!user?.uid || !window.confirm("Are you sure you want to delete this connection?")) return;
    await settingsStore.deleteAiConnection(user.uid, connectionId);
    showSnackbar('Connection deleted.', 'success');
  }, [user, settingsStore, showSnackbar]);

  const closeSnackbar = useCallback(() => setSnackbar(prev => ({ ...prev, open: false })), []);

  return {
    ...settingsStore,
    isDialogOpen,
    dialogStep,
    editingConnection,
    availableModels,
    isFetchingModels,
    testStatus,
    snackbar,
    templates: aiConnectionTemplates,
    modelSearchTerm,
    setModelSearchTerm,
    filteredModels,
    handleOpenDialog,
    handleCloseDialog,
    handleLoadTemplate,
    handleUpdateEditingConnection,
    handleFetchModels,
    handleSaveAndTest,
    handleDelete,
    closeSnackbar,
    handleTest,
  };
};