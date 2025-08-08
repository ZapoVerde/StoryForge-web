// src/ui/screens/WorldStateScreen.tsx
import React, { useState, useMemo, useCallback } from 'react';
import {
  Box, Typography, Button, Paper, 
  Alert, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField,
} from '@mui/material';
import {
  useGameStateStore,
  selectWorldStatePinnedKeys,
  selectCurrentGameState,
} from '../../state/useGameStateStore';
import { flattenJsonObject, getNestedValue } from '../../utils/jsonUtils';
import { WorldStateCategory } from '../components/WorldStateCategory';

const WorldStateScreen: React.FC = () => {
  // --- Start of Co-located Logic (from the old useWorldStateViewLogic hook) ---

  const gameState = useGameStateStore(selectCurrentGameState);
  const worldStatePinnedKeys = useGameStateStore(selectWorldStatePinnedKeys);
  const {
    toggleWorldStatePin, renameWorldCategory, renameWorldEntity,
    deleteWorldCategory, deleteWorldEntity, editWorldKeyValue, deleteWorldKey,
  } = useGameStateStore();

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedEntities, setExpandedEntities] = useState<Set<string>>(new Set());
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingEntity, setEditingEntity] = useState<[string, string] | null>(null);
  const [newEntityName, setNewEntityName] = useState('');

  const worldState = gameState?.worldState || {};

  const flattenedWorld = useMemo(() => flattenJsonObject(worldState), [worldState]);

  const groupedByCategory = useMemo(() => {
    const grouped: Record<string, Record<string, Record<string, any>>> = {};
    Object.keys(flattenedWorld).forEach(fullKey => {
      const value = flattenedWorld[fullKey];
      const parts = fullKey.split(".");
      if (parts.length < 1) return;

      const category = parts[0];
      const entity = (parts.length > 1 && /^[#@$]/.test(parts[1])) ? parts[1] : '@@_direct';
      const variable = (entity === '@@_direct') ? parts.slice(1).join('.') : parts.slice(2).join('.');
      if (!variable && entity !== '@@_direct') return; // Skip if entity has no variables

      grouped[category] = grouped[category] || {};
      grouped[category][entity] = grouped[category][entity] || {};
      grouped[category][entity][variable] = value;
    });
    // Clean up empty direct keys
    Object.keys(grouped).forEach(category => {
      if (grouped[category]['@@_direct'] && Object.keys(grouped[category]['@@_direct']).length === 0) {
        delete grouped[category]['@@_direct'];
      }
    });
    return grouped;
  }, [flattenedWorld]);

  const getAllChildVariableKeys = useCallback((basePath: string): string[] => {
    const nestedData = getNestedValue(worldState, basePath.split('.'));
    if (typeof nestedData !== 'object' || nestedData === null) return [];
    return Object.keys(flattenJsonObject(nestedData, basePath));
  }, [worldState]);

  const isAnyChildPinned = useCallback((parentPath: string) => {
    return getAllChildVariableKeys(parentPath).some(key => worldStatePinnedKeys.includes(key));
  }, [getAllChildVariableKeys, worldStatePinnedKeys]);

  const areAllChildrenPinned = useCallback((parentPath: string) => {
    const childKeys = getAllChildVariableKeys(parentPath);
    return childKeys.length > 0 && childKeys.every(key => worldStatePinnedKeys.includes(key));
  }, [getAllChildVariableKeys, worldStatePinnedKeys]);

  const handleToggleCategoryExpand = useCallback((category: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      newSet.has(category) ? newSet.delete(category) : newSet.add(category);
      return newSet;
    });
  }, []);

  const handleToggleEntityExpand = useCallback((entityPath: string) => {
    setExpandedEntities(prev => {
      const newSet = new Set(prev);
      newSet.has(entityPath) ? newSet.delete(entityPath) : newSet.add(entityPath);
      return newSet;
    });
  }, []);
  
  const handleToggleCategoryPin = useCallback((category: string) => toggleWorldStatePin(category, 'category'), [toggleWorldStatePin]);
  const handleToggleEntityPin = useCallback((entityPath: string) => toggleWorldStatePin(entityPath, 'entity'), [toggleWorldStatePin]);
  const handleToggleVariablePin = useCallback((key: string) => toggleWorldStatePin(key, 'variable'), [toggleWorldStatePin]);

  const handleStartRenameCategory = useCallback((category: string) => { setEditingCategory(category); setNewCategoryName(category); }, []);
  const handleStartRenameEntity = useCallback((category: string, entity: string) => { setEditingEntity([category, entity]); setNewEntityName(entity); }, []);

  const cancelEdit = useCallback(() => { setEditingCategory(null); setEditingEntity(null); }, []);

  const handleConfirmRenameCategory = useCallback(async () => {
    if (editingCategory && newCategoryName.trim() && newCategoryName !== editingCategory) {
      await renameWorldCategory(editingCategory, newCategoryName.trim());
    }
    cancelEdit();
  }, [editingCategory, newCategoryName, renameWorldCategory, cancelEdit]);

  const handleConfirmRenameEntity = useCallback(async () => {
    if (editingEntity && newEntityName.trim() && newEntityName !== editingEntity[1]) {
      await renameWorldEntity(editingEntity[0], editingEntity[1], newEntityName.trim());
    }
    cancelEdit();
  }, [editingEntity, newEntityName, renameWorldEntity, cancelEdit]);

  // --- End of Co-located Logic ---

  const { gameError } = useGameStateStore();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', p: 2 }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h5" component="h1">World State</Typography>
      </Box>

      {gameError && (<Alert severity="error" sx={{ m: 2 }}>{gameError}</Alert>)}

      {Object.keys(groupedByCategory).length === 0 ? (
        <Box sx={{ p: 3, textAlign: 'center', mt: 4 }}>
          <Typography variant="body1" color="text.secondary">No world state data available.</Typography>
        </Box>
      ) : (
        <Paper elevation={1} sx={{ flexGrow: 1, m: 2, p: 2, overflowY: 'auto' }}>
          {Object.entries(groupedByCategory).map(([categoryName, entities]) => (
            <WorldStateCategory
              key={categoryName}
              categoryName={categoryName}
              entities={entities}
              isExpanded={expandedCategories.has(categoryName)}
              areAllChildrenPinned={areAllChildrenPinned(categoryName)}
              isAnyChildPinned={isAnyChildPinned(categoryName)}
              expandedEntities={expandedEntities}
              worldStatePinnedKeys={worldStatePinnedKeys}
              onToggleExpand={() => handleToggleCategoryExpand(categoryName)}
              onTogglePin={() => handleToggleCategoryPin(categoryName)}
              onStartRename={() => handleStartRenameCategory(categoryName)}
              onDelete={() => deleteWorldCategory(categoryName)}
              onToggleEntityExpand={handleToggleEntityExpand}
              onToggleEntityPin={handleToggleEntityPin}
              onStartRenameEntity={handleStartRenameEntity}
              onDeleteEntity={deleteWorldEntity}
              onDeleteKey={deleteWorldKey}
              onEditKey={editWorldKeyValue}
              onToggleVariablePin={handleToggleVariablePin}
            />
          ))}
        </Paper>
      )}

      {/* Dialogs for renaming */}
      <Dialog open={!!editingCategory} onClose={cancelEdit}>
        <DialogTitle>Rename Category</DialogTitle>
        <DialogContent>
          <TextField autoFocus margin="dense" label="New Category Name" fullWidth variant="outlined" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleConfirmRenameCategory()} />
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelEdit}>Cancel</Button>
          <Button onClick={handleConfirmRenameCategory}>Rename</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!editingEntity} onClose={cancelEdit}>
        <DialogTitle>Rename Entity</DialogTitle>
        <DialogContent>
          <TextField autoFocus margin="dense" label="New Entity Name" fullWidth variant="outlined" value={newEntityName} onChange={(e) => setNewEntityName(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleConfirmRenameEntity()} />
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelEdit}>Cancel</Button>
          <Button onClick={handleConfirmRenameEntity}>Rename</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WorldStateScreen;