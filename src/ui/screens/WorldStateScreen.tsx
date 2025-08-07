// src/ui/screens/WorldStateScreen.tsx
import React from 'react';
import {
  Box, Typography, Button, IconButton, Paper, 
  Alert, List, Collapse, Checkbox, TextField, Dialog, DialogTitle, DialogContent,
  DialogActions, Divider,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { useGameStateStore, selectWorldStatePinnedKeys } from '../../state/useGameStateStore'; // Selectors imported
import { useWorldStateViewLogic } from '../../utils/hooks/useWorldStateViewLogic';
import { WorldStateItemRow } from '../components/WorldStateItemRow';
import { debugLog, errorLog } from '../../utils/debug';

const WorldStateScreen: React.FC = () => {
  const worldStatePinnedKeys = useGameStateStore(selectWorldStatePinnedKeys); // Use selector
  const { gameError } = useGameStateStore(); // Top-level state is fine

  // --- Keep your existing DEBUG LINES here for verification ---
  debugLog('%c[WorldStateScreen.tsx] Component re-rendered.', 'color: #008080; font-weight: bold;');
  debugLog('[WorldStateScreen.tsx] Pinned Keys (from store selector):', worldStatePinnedKeys);
  // --- END DEBUG LINES ---

  const {
    groupedByCategory,
    // All other state variables (expandedCategories, editingCategory, etc.) are now correctly sourced from the hook:
    expandedCategories,
    expandedEntities,
    editingCategory,
    newCategoryName,
    editingEntity,
    newEntityName,
    isAnyChildPinned, // These methods come from the hook
    areAllChildrenPinned, // These methods come from the hook
    handleToggleCategoryExpand, // Local handlers returned by hook
    handleToggleEntityExpand,   // Local handlers returned by hook
    handleToggleCategoryPin,    // Local handlers returned by hook
    handleToggleEntityPin,      // Local handlers returned by hook
    handleStartRenameCategory,
    handleConfirmRenameCategory,
    setNewCategoryName,
    handleStartRenameEntity,
    handleConfirmRenameEntity,
    setNewEntityName,
    cancelEdit,
    // Actions passed directly from store (for clarity)
    deleteWorldCategory,
    deleteWorldEntity,
    editWorldKeyValue,
    deleteWorldKey,
    toggleWorldStatePin, // Ensure actions from store are correctly accessible
  } = useWorldStateViewLogic(); 

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', p: 2 }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h5" component="h1">World State</Typography>
      </Box>

      {gameError && (<Alert severity="error" sx={{ m: 2 }}>Error: {gameError}</Alert>)}

      {Object.keys(groupedByCategory).length === 0 ? (
        <Box sx={{ p: 3, textAlign: 'center', mt: 4 }}>
          <Typography variant="body1" color="text.secondary">No world state data available.</Typography>
        </Box>
      ) : (
        <Paper elevation={1} sx={{ flexGrow: 1, m: 2, p: 2, overflowY: 'auto' }}>
          {Object.entries(groupedByCategory).map(([category, entities]) => (
            <Box key={category} sx={{ mb: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', p: 1.5, cursor: 'pointer', backgroundColor: 'action.hover' }} onClick={() => handleToggleCategoryExpand(category)}>
                <IconButton size="small" sx={{ mr: 1 }}>{expandedCategories.has(category) ? <ExpandLessIcon /> : <ExpandMoreIcon />}</IconButton>
                <Typography variant="h6" sx={{ flexGrow: 1 }}>{category}</Typography>
                <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleStartRenameCategory(category); }}><EditIcon fontSize="small" /></IconButton>
                {/* Use the hook's own methods correctly */}
                <Checkbox checked={areAllChildrenPinned(category)} indeterminate={isAnyChildPinned(category) && !areAllChildrenPinned(category)} onClick={(e) => { e.stopPropagation(); handleToggleCategoryPin(category); }} />
                <IconButton size="small" onClick={(e) => { e.stopPropagation(); deleteWorldCategory(category); }}><DeleteIcon fontSize="small" color="error" /></IconButton>
              </Box>
              <Collapse in={expandedCategories.has(category)}>
                <Divider />
                <List component="div" disablePadding sx={{ pl: 2 }}>
                  {Object.entries(entities).map(([entity, variables]) => {
                    const entityPath = `${category}.${entity}`;
                    if (entity === '@@_direct') {
                      return Object.entries(variables).map(([varName, value]) => (
                        <WorldStateItemRow key={`${category}.${varName}`} itemKey={`${category}.${varName}`} value={value} onDelete={deleteWorldKey} onEdit={editWorldKeyValue} isPinned={worldStatePinnedKeys.includes(`${category}.${varName}`)} onTogglePin={(key) => toggleWorldStatePin(key, 'variable')} />
                      ));
                    }
                    return (
                      <Box key={entity} sx={{ mb: 1, border: '1px dashed', borderColor: 'divider', borderRadius: 1, mt: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', p: 1, cursor: 'pointer' }} onClick={() => handleToggleEntityExpand(category, entity)}>
                          <IconButton size="small" sx={{ mr: 1 }}>{expandedEntities.has(entityPath) ? <ExpandLessIcon /> : <ExpandMoreIcon />}</IconButton>
                          <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>{entity}</Typography>
                          <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleStartRenameEntity([category, entity]); }}><EditIcon fontSize="small" /></IconButton>
                           {/* Use the hook's own methods correctly */}
                          <Checkbox checked={areAllChildrenPinned(entityPath)} indeterminate={isAnyChildPinned(entityPath) && !areAllChildrenPinned(entityPath)} onClick={(e) => { e.stopPropagation(); handleToggleEntityPin(entityPath); }} />
                          <IconButton size="small" onClick={(e) => { e.stopPropagation(); deleteWorldEntity(category, entity); }}><DeleteIcon fontSize="small" color="error" /></IconButton>
                        </Box>
                        <Collapse in={expandedEntities.has(entityPath)}>
                          <Divider />
                          <Box sx={{ p: 1.5 }}>
                            {Object.entries(variables).map(([varName, value]) => (
                              <WorldStateItemRow key={varName} itemKey={`${entityPath}.${varName}`} value={value} onDelete={deleteWorldKey} onEdit={editWorldKeyValue} isPinned={worldStatePinnedKeys.includes(`${entityPath}.${varName}`)} onTogglePin={(key) => toggleWorldStatePin(key, 'variable')} />
                            ))}
                          </Box>
                        </Collapse>
                      </Box>
                    );
                  })}
                </List>
              </Collapse>
            </Box>
          ))}
        </Paper>
      )}

      <Dialog open={!!editingCategory} onClose={cancelEdit}>
        <DialogTitle>Rename Category</DialogTitle>
        <DialogContent><TextField autoFocus margin="dense" label="New Category Name" type="text" fullWidth variant="outlined" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} /></DialogContent>
        <DialogActions><Button onClick={cancelEdit}>Cancel</Button><Button onClick={handleConfirmRenameCategory}>Rename</Button></DialogActions>
      </Dialog>

      <Dialog open={!!editingEntity} onClose={cancelEdit}>
        <DialogTitle>Rename Entity</DialogTitle>
        <DialogContent><TextField autoFocus margin="dense" label="New Entity Name" type="text" fullWidth variant="outlined" value={newEntityName} onChange={(e) => setNewEntityName(e.target.value)} /></DialogContent>
        <DialogActions><Button onClick={cancelEdit}>Cancel</Button><Button onClick={handleConfirmRenameEntity}>Rename</Button></DialogActions>
      </Dialog>
    </Box>
  );
};

export default WorldStateScreen;