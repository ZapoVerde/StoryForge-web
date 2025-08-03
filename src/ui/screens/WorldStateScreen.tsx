// src/ui/screens/WorldStateScreen.tsx

import React, { useState, useEffect, useCallback, useMemo } from 'react'; // Import useCallback and useMemo
import {
  Box,
  Typography,
  Button,
  AppBar,
  Toolbar,
  IconButton,
  Paper,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  Collapse,
  Checkbox,
  Switch,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { useGameStateStore } from '../../state/useGameStateStore';
import { flattenJsonObject, getNestedValue } from '../../utils/jsonUtils';
import { WorldStateItemRow } from '../components/WorldStateItemRow';

interface WorldStateScreenProps {
  onNavToggle: () => void;
}

interface GroupedWorldState {
  [category: string]: {
    [entity: string]: {
      [variable: string]: any;
      tag?: string; // Add tag as a possible property for entities
    };
  };
}

const WorldStateScreen: React.FC<WorldStateScreenProps> = ({ onNavToggle }) => {
  const {
    currentGameState,
    gameLoading,
    gameError,
    worldStatePinnedKeys,
    toggleWorldStatePin,
    renameWorldCategory,
    renameWorldEntity,
    deleteWorldCategory,
    deleteWorldEntity,
    editWorldKeyValue,
    deleteWorldKey,
  } = useGameStateStore();

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedEntities, setExpandedEntities] = useState<Set<string>>(new Set());
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingEntity, setEditingEntity] = useState<[string, string] | null>(null);
  const [newEntityName, setNewEntityName] = useState('');

  const worldState = currentGameState?.worldState || {};
  const flattenedWorld = useMemo(() => flattenJsonObject(worldState), [worldState]);

  // Helper function: Get all direct child variable keys under a given path
  const getAllChildVariableKeys = useCallback((basePath: string): string[] => {
    const relevantKeys: string[] = [];
    const nestedData = getNestedValue(worldState, basePath.split('.'));

    if (typeof nestedData !== 'object' || nestedData === null) {
      return [];
    }

    const flattenedChildren = flattenJsonObject(nestedData, basePath);

    // Filter to only include direct children (variables) of the current path
    // A key "parent.child.grandchild" is a child of "parent.child" but not a direct child of "parent"
    for (const key in flattenedChildren) {
        if (key.startsWith(basePath) && key.length > basePath.length) { // Ensure it's a descendant
            // Check if it's a direct variable and not an intermediate object in a deeper path
            const partsAfterBase = key.substring(basePath.length + 1).split('.');
            if (partsAfterBase.length === 1 && typeof flattenedChildren[key] !== 'object') {
                relevantKeys.push(key);
            } else if (partsAfterBase.length > 1 && typeof getNestedValue(nestedData, partsAfterBase.slice(0, partsAfterBase.length -1)) === 'object') {
                // If it's a nested key, but its immediate parent is still an object (not a primitive value)
                // this means it's an intermediate path or a variable under a nested object.
                // We want to capture the leaf variables. This logic needs to be careful.
                // A simpler approach for "all variables under a path" is to flatten and then filter.
                relevantKeys.push(key); // Add all descendant leaf nodes
            }
        }
    }
    return relevantKeys;
  }, [worldState]);


  // Helper: Check if ANY child variable of a given parent path is pinned
  const isAnyChildPinned = useCallback((parentPath: string) => {
    const allChildKeys = getAllChildVariableKeys(parentPath);
    return allChildKeys.some(key => worldStatePinnedKeys.includes(key));
  }, [getAllChildVariableKeys, worldStatePinnedKeys]);

  // Helper: Check if ALL child variables of a given parent path are pinned
  const areAllChildrenPinned = useCallback((parentPath: string) => {
    const allChildKeys = getAllChildVariableKeys(parentPath);
    if (allChildKeys.length === 0) return false; // No children to be pinned, so not "all pinned"
    return allChildKeys.every(key => worldStatePinnedKeys.includes(key));
  }, [getAllChildVariableKeys, worldStatePinnedKeys]);


  const groupedByCategory: GroupedWorldState = useMemo(() => {
    const grouped: GroupedWorldState = {};
    for (const fullKey in flattenedWorld) {
      const value = flattenedWorld[fullKey];
      const parts = fullKey.split(".");
      if (parts.length < 1) continue; // Should at least have a category

      const category = parts[0];
      let entity: string | undefined;
      let variable: string;

      // Determine if it's category.entity.variable or just category.variable
      // If path is "category.variable" -> entity is '@@_direct', variable is 'variable'
      // If path is "category.entity.variable" -> entity is 'entity', variable is 'variable'
      const isTopLevelVariable = parts.length === 2 && !parts[1].startsWith('#') && !parts[1].startsWith('@') && !parts[1].startsWith('$');
      const isNestedEntityVariable = parts.length >= 2 && (parts[1].startsWith('#') || parts[1].startsWith('@') || parts[1].startsWith('$'));

      if (isNestedEntityVariable) {
          entity = parts[1];
          variable = parts.slice(2).join(".");
      } else { // Handle top-level category variables or untagged entities that are direct children of categories
          entity = '@@_direct'; // Use a special marker for direct category properties
          variable = parts.slice(1).join(".");
      }

      grouped[category] = grouped[category] || {};
      grouped[category][entity] = grouped[category][entity] || {};
      grouped[category][entity][variable] = value;
    }

    // Clean up empty '@@_direct' entities if no direct variables existed
    for (const category in grouped) {
      if (Object.keys(grouped[category]['@@_direct'] || {}).length === 0) {
        delete grouped[category]['@@_direct'];
      }
    }
    return grouped;
  }, [flattenedWorld]);


  const handleToggleCategoryPin = useCallback((category: string) => {
    const allVarsInCat = getAllChildVariableKeys(category);
    const currentlyAllPinned = areAllChildrenPinned(category);
    
    // If all are currently pinned, unpin all. Otherwise, pin all.
    const shouldPin = !currentlyAllPinned;

    allVarsInCat.forEach(key => {
        toggleWorldStatePin(key, 'variable'); // `toggleWorldStatePin` handles adding/removing based on its internal logic
    });
  }, [getAllChildVariableKeys, areAllChildrenPinned, toggleWorldStatePin]);

  const handleToggleEntityPin = useCallback((category: string, entity: string) => {
    const entityPath = `${category}.${entity}`;
    const allVarsInEntity = getAllChildVariableKeys(entityPath);
    const currentlyAllPinned = areAllChildrenPinned(entityPath);

    const shouldPin = !currentlyAllPinned;

    allVarsInEntity.forEach(key => {
        toggleWorldStatePin(key, 'variable');
    });
  }, [getAllChildVariableKeys, areAllChildrenPinned, toggleWorldStatePin]);


  const handleToggleCategoryExpand = useCallback((category: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  }, []);

  const handleToggleEntityExpand = useCallback((category: string, entity: string) => {
    const key = `${category}.${entity}`;
    setExpandedEntities((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  }, []);

  const handleStartRenameCategory = useCallback((category: string) => {
    setEditingCategory(category);
    setNewCategoryName(category);
  }, []);

  const handleConfirmRenameCategory = useCallback(async () => {
    if (editingCategory && newCategoryName.trim() !== '' && newCategoryName !== editingCategory) {
      await renameWorldCategory(editingCategory, newCategoryName);
    }
    setEditingCategory(null);
  }, [editingCategory, newCategoryName, renameWorldCategory]);

  const handleStartRenameEntity = useCallback((category: string, entity: string) => {
    setEditingEntity([category, entity]);
    setNewEntityName(entity);
  }, []);

  const handleConfirmRenameEntity = useCallback(async () => {
    if (editingEntity && newEntityName.trim() !== '' && newEntityName !== editingEntity[1]) {
      await renameWorldEntity(editingEntity[0], editingEntity[1], newEntityName);
    }
    setEditingEntity(null);
  }, [editingEntity, newEntityName, renameWorldEntity]);


  if (gameLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
        <Typography variant="h6" ml={2}>Loading World State...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', p: 2 }}>
      {/* Header */}
      <AppBar position="static" elevation={1}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            World State
          </Typography>
          <IconButton edge="end" color="inherit" aria-label="menu" onClick={onNavToggle}>
            <MenuIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {gameError && (
        <Alert severity="error" sx={{ m: 2 }}>
          Error: {gameError}
        </Alert>
      )}

      {Object.keys(groupedByCategory).length === 0 ? (
        <Box sx={{ p: 3, textAlign: 'center', mt: 4 }}>
          <Typography variant="body1" color="text.secondary">
            No world state data available. Start a game to generate it.
          </Typography>
        </Box>
      ) : (
        <Paper elevation={1} sx={{ flexGrow: 1, m: 2, p: 2, overflowY: 'auto' }}>
          {Object.entries(groupedByCategory).map(([category, entities]) => {
            const isCategoryExpanded = expandedCategories.has(category);
            const categoryAllPinned = areAllChildrenPinned(category);
            const categoryAnyPinned = isAnyChildPinned(category);

            return (
              <Box key={category} sx={{ mb: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    p: 1.5,
                    cursor: 'pointer',
                    backgroundColor: (theme) => theme.palette.action.hover,
                  }}
                  onClick={() => handleToggleCategoryExpand(category)}
                >
                  <IconButton size="small" sx={{ mr: 1 }}>
                    {isCategoryExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </IconButton>
                  <Typography variant="h6" sx={{ flexGrow: 1 }}>
                    {category}
                  </Typography>
                  <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleStartRenameCategory(category); }}><EditIcon fontSize="small" /></IconButton>
                  <Checkbox
                    checked={categoryAllPinned}
                    indeterminate={categoryAnyPinned && !categoryAllPinned}
                    onClick={(e) => { e.stopPropagation(); handleToggleCategoryPin(category); }}
                  />
                  <IconButton size="small" onClick={(e) => { e.stopPropagation(); deleteWorldCategory(category); }}>
                    <DeleteIcon fontSize="small" color="error" />
                  </IconButton>
                </Box>
                <Collapse in={isCategoryExpanded}>
                  <Divider />
                  <List component="div" disablePadding sx={{ pl: 2 }}>
                    {Object.entries(entities).map(([entity, variables]) => {
                      // Handle the '@@_direct' special entity for direct category variables
                      if (entity === '@@_direct') {
                        return Object.entries(variables).map(([varName, value]) => (
                          <WorldStateItemRow
                            key={`${category}.${varName}`}
                            itemKey={`${category}.${varName}`}
                            value={value}
                            onDelete={deleteWorldKey}
                            onEdit={editWorldKeyValue}
                            isPinned={worldStatePinnedKeys.includes(`${category}.${varName}`)}
                            onTogglePin={(key) => toggleWorldStatePin(key, 'variable')}
                          />
                        ));
                      }

                      const isEntityExpanded = expandedEntities.has(`${category}.${entity}`);
                      const entityPath = `${category}.${entity}`;
                      const entityAllPinned = areAllChildrenPinned(entityPath);
                      const entityAnyPinned = isAnyChildPinned(entityPath);

                      // Extract tag for display/editing if it exists as a direct property of the entity object
                      // The tag might be directly on the entity object itself, or be a nested field (less common for "tag")
                      const tagValue = (variables as any).tag; // Assuming 'tag' is a direct property

                      return (
                        <Box key={entity} sx={{ mb: 1, border: '1px dashed', borderColor: 'divider', borderRadius: 1, mt: 1 }}>
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              p: 1,
                              cursor: 'pointer',
                              backgroundColor: (theme) => theme.palette.background.paper,
                            }}
                            onClick={() => handleToggleEntityExpand(category, entity)}
                          >
                            <IconButton size="small" sx={{ mr: 1 }}>
                              {isEntityExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                            </IconButton>
                            <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
                              {entity}
                            </Typography>
                            <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleStartRenameEntity(category, entity); }}><EditIcon fontSize="small" /></IconButton>
                            <Checkbox
                              checked={entityAllPinned}
                              indeterminate={entityAnyPinned && !entityAllPinned}
                              onClick={(e) => { e.stopPropagation(); handleToggleEntityPin(category, entity); }}
                            />
                            <IconButton size="small" onClick={(e) => { e.stopPropagation(); deleteWorldEntity(category, entity); }}>
                              <DeleteIcon fontSize="small" color="error" />
                            </IconButton>
                          </Box>
                          <Collapse in={isEntityExpanded}>
                            <Divider />
                            <Box sx={{ p: 1.5 }}>
                              {/* Tag Editor: Only show tag editor if the entity name suggests it's a tagged entity */}
                              {(entity.startsWith('#') || entity.startsWith('@') || entity.startsWith('$')) && (
                                <TextField
                                  fullWidth
                                  label="Tag"
                                  value={tagValue || ''} // Display current tag value
                                  onChange={(e) => {
                                    const raw = e.target.value.trim();
                                    // Basic validation for tags
                                    const isValid = raw === '' || raw.startsWith("#") || raw.startsWith("@") || raw.startsWith("$");
                                    if (isValid) {
                                        editWorldKeyValue(`${category}.${entity}.tag`, raw);
                                    } else {
                                        // Provide user feedback for invalid tag format
                                        console.warn("Invalid tag format. Tags should start with #, @, or $.");
                                    }
                                  }}
                                  sx={{ mb: 1.5 }}
                                />
                              )}

                              {Object.entries(variables).filter(([varName]) => varName !== 'tag').map(([varName, value]) => (
                                <WorldStateItemRow
                                  key={varName}
                                  itemKey={`${entityPath}.${varName}`}
                                  value={value}
                                  onDelete={deleteWorldKey}
                                  onEdit={editWorldKeyValue}
                                  isPinned={worldStatePinnedKeys.includes(`${entityPath}.${varName}`)}
                                  onTogglePin={(key) => toggleWorldStatePin(key, 'variable')}
                                />
                              ))}
                            </Box>
                          </Collapse>
                        </Box>
                      );
                    })}
                  </List>
                </Collapse>
              </Box>
            );
          })}
        </Paper>
      )}

      {/* Rename Category Dialog */}
      <Dialog open={!!editingCategory} onClose={() => setEditingCategory(null)}>
        <DialogTitle>Rename Category</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="New Category Name"
            type="text"
            fullWidth
            variant="outlined"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingCategory(null)}>Cancel</Button>
          <Button onClick={handleConfirmRenameCategory}>Rename</Button>
        </DialogActions>
      </Dialog>

      {/* Rename Entity Dialog */}
      <Dialog open={!!editingEntity} onClose={() => setEditingEntity(null)}>
        <DialogTitle>Rename Entity</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="New Entity Name"
            type="text"
            fullWidth
            variant="outlined"
            value={newEntityName}
            onChange={(e) => setNewEntityName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingEntity(null)}>Cancel</Button>
          <Button onClick={handleConfirmRenameEntity}>Rename</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WorldStateScreen;