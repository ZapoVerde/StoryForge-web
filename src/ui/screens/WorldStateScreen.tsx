// src/ui/screens/WorldStateScreen.tsx

import React, { useState, useEffect } from 'react';
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
  Switch, // Not directly used for pinning, but was in stub
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
      tag?: string;
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
  const flattenedWorld = React.useMemo(() => flattenJsonObject(worldState), [worldState]);

  const groupedByCategory: GroupedWorldState = React.useMemo(() => {
    const grouped: GroupedWorldState = {};
    for (const fullKey in flattenedWorld) {
      const value = flattenedWorld[fullKey];
      const parts = fullKey.split(".");
      if (parts.length < 2) continue; // Needs at least category.variable or category.entity

      const category = parts[0];
      let entity: string | undefined;
      let variable: string;

      // Determine if it's a category.entity.variable or just category.variable
      // This logic attempts to distinguish between direct properties of a category
      // and properties nested within entities, which may have tags.
      // We assume if the second part of the path (entity) has a #, @, or $ prefix, it's an entity.
      const secondPart = parts[1];
      const isTaggedEntity = secondPart.startsWith('#') || secondPart.startsWith('@') || secondPart.startsWith('$');

      if (parts.length >= 3 && isTaggedEntity) {
        entity = parts[1];
        variable = parts.slice(2).join(".");
      } else { // Handle top-level category variables (e.g., inventory.sword) or untagged entities
        entity = undefined; // No distinct entity level
        variable = parts.slice(1).join("."); // Variable is everything after category
      }

      grouped[category] = grouped[category] || {};
      if (entity) {
        grouped[category][entity] = grouped[category][entity] || {};
        grouped[category][entity][variable] = value;
      } else {
        // Treat direct category variables as if they are under a special '@@_direct' entity
        // This is a hack to fit into the current grouping structure if direct category properties exist
        grouped[category]['@@_direct'] = grouped[category]['@@_direct'] || {};
        grouped[category]['@@_direct'][variable] = value;
      }
    }

    // Filter out empty '@@_direct' if it was created but no direct variables existed
    for (const category in grouped) {
      if (Object.keys(grouped[category]).length === 1 && grouped[category]['@@_direct'] && Object.keys(grouped[category]['@@_direct']).length === 0) {
        delete grouped[category]['@@_direct'];
      }
    }
    return grouped;
  }, [flattenedWorld]);


  const getAllChildVariableKeys = useCallback((basePath: string, targetType: 'entity' | 'category'): string[] => {
    const relevantKeys: string[] = [];
    const nestedData = getNestedValue(worldState, basePath.split('.'));
    if (typeof nestedData !== 'object' || nestedData === null) {
      return [];
    }
    const flattenedChildren = flattenJsonObject(nestedData, basePath);

    for (const key in flattenedChildren) {
      if (key.startsWith(basePath + '.') && key.split('.').length > basePath.split('.').length) {
        relevantKeys.push(key);
      }
    }
    return relevantKeys;
  }, [worldState]);


  const isAnyChildPinned = useCallback((parentPath: string, type: 'entity' | 'category') => {
    const allChildKeys = getAllChildVariableKeys(parentPath, type);
    return allChildKeys.some(key => worldStatePinnedKeys.includes(key));
  }, [getAllChildVariableKeys, worldStatePinnedKeys]);

  const areAllChildrenPinned = useCallback((parentPath: string, type: 'entity' | 'category') => {
    const allChildKeys = getAllChildVariableKeys(parentPath, type);
    if (allChildKeys.length === 0) return false; // No children to be pinned
    return allChildKeys.every(key => worldStatePinnedKeys.includes(key));
  }, [getAllChildVariableKeys, worldStatePinnedKeys]);


  const handleToggleCategoryPin = (category: string) => {
    const allVarsInCat = getAllChildVariableKeys(category, 'category');
    const currentlyAllPinned = areAllChildrenPinned(category, 'category');
    const currentlyAnyPinned = isAnyChildPinned(category, 'category');

    // If all are pinned, unpin all. If none or some are pinned, pin all.
    const shouldPin = !currentlyAllPinned;

    allVarsInCat.forEach(key => {
      if (shouldPin && !worldStatePinnedKeys.includes(key)) {
        toggleWorldStatePin(key, 'variable'); // Pin individual variable
      } else if (!shouldPin && worldStatePinnedKeys.includes(key)) {
        toggleWorldStatePin(key, 'variable'); // Unpin individual variable
      }
    });
  };

  const handleToggleEntityPin = (category: string, entity: string) => {
    const entityPath = `${category}.${entity}`;
    const allVarsInEntity = getAllChildVariableKeys(entityPath, 'entity');
    const currentlyAllPinned = areAllChildrenPinned(entityPath, 'entity');

    const shouldPin = !currentlyAllPinned;

    allVarsInEntity.forEach(key => {
      if (shouldPin && !worldStatePinnedKeys.includes(key)) {
        toggleWorldStatePin(key, 'variable');
      } else if (!shouldPin && worldStatePinnedKeys.includes(key)) {
        toggleWorldStatePin(key, 'variable');
      }
    });
  };


  const handleToggleCategoryExpand = (category: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  const handleToggleEntityExpand = (category: string, entity: string) => {
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
  };

  const handleStartRenameCategory = (category: string) => {
    setEditingCategory(category);
    setNewCategoryName(category);
  };

  const handleConfirmRenameCategory = async () => {
    if (editingCategory && newCategoryName.trim() !== '' && newCategoryName !== editingCategory) {
      await renameWorldCategory(editingCategory, newCategoryName);
    }
    setEditingCategory(null);
  };

  const handleStartRenameEntity = (category: string, entity: string) => {
    setEditingEntity([category, entity]);
    setNewEntityName(entity);
  };

  const handleConfirmRenameEntity = async () => {
    if (editingEntity && newEntityName.trim() !== '' && newEntityName !== editingEntity[1]) {
      await renameWorldEntity(editingEntity[0], editingEntity[1], newEntityName);
    }
    setEditingEntity(null);
  };

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
            const categoryAllPinned = areAllChildrenPinned(category, 'category');
            const categoryAnyPinned = isAnyChildPinned(category, 'category');

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
                      // Skip the dummy '@@_direct' entity for display purposes
                      if (entity === '@@_direct') {
                        // Render direct category variables
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
                      const entityAllPinned = areAllChildrenPinned(entityPath, 'entity');
                      const entityAnyPinned = isAnyChildPinned(entityPath, 'entity');

                      // Extract tag for display/editing
                      const tagValue = (variables.tag as any)?.jsonPrimitive?.contentOrNull || (typeof variables.tag === 'string' ? variables.tag : '');

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
                              {/* Tag Editor */}
                              {/* Only show tag editor if the entity name suggests it's a tagged entity */}
                              {(entity.startsWith('#') || entity.startsWith('@') || entity.startsWith('$')) && (
                                <TextField
                                  fullWidth
                                  label="Tag"
                                  value={tagValue}
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