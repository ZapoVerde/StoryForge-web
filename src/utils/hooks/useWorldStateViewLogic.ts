// src/utils/hooks/useWorldStateViewLogic.ts
import { useState, useMemo, useCallback } from 'react';
// IMPORT THE SELECTOR FOR PINNED KEYS
import {
    useGameStateStore,
    selectWorldStatePinnedKeys,
    selectCurrentGameState,
  } from '../../state/useGameStateStore';
import { flattenJsonObject, getNestedValue } from '../../utils/jsonUtils';
import { debugLog, errorLog } from '../../utils/debug';

interface GroupedWorldState {
    [category: string]: {
        [entity: string]: {
            [variable: string]: any;
        };
    };
}

export const useWorldStateViewLogic = () => {
    const gameState = useGameStateStore(selectCurrentGameState);
    // 1. Get necessary state and actions from the store
    const worldStatePinnedKeys = useGameStateStore(selectWorldStatePinnedKeys);
    const {
        toggleWorldStatePin, // Action to toggle pins
        renameWorldCategory, // Action to rename categories
        renameWorldEntity,   // Action to rename entities
        deleteWorldCategory, // Action to delete categories
        deleteWorldEntity,   // Action to delete entities
        editWorldKeyValue,   // Action to edit key-value pairs
        deleteWorldKey,      // Action to delete keys
    } = useGameStateStore(); // Destructure actions directly

    // 2. Declare and initialize all local UI state variables
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
    const [expandedEntities, setExpandedEntities] = useState<Set<string>>(new Set());
    const [editingCategory, setEditingCategory] = useState<string | null>(null);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [editingEntity, setEditingEntity] = useState<[string, string] | null>(null); // Stores [category, entity]
    const [newEntityName, setNewEntityName] = useState('');

    // --- KEEP EXISTING DEBUG LINES ---
    debugLog('%c[useWorldStateViewLogic.ts] Hook re-executed.', 'color: #B8860B; font-weight: bold;');
    debugLog('[useWorldStateViewLogic.ts] Received gameState prop from WorldStateScreen:', JSON.stringify(gameState, null, 2));
    debugLog('[useWorldStateViewLogic.ts] Extracted worldState from prop (gameState?.worldState):', JSON.stringify(gameState?.worldState, null, 2));
    debugLog('[useWorldStateViewLogic.ts] Extracted worldState keys length (gameState?.worldState):', Object.keys(gameState?.worldState || {}).length);
    debugLog('[useWorldStateViewLogic.ts] Pinned keys directly from store (in logic):', worldStatePinnedKeys);
    // --- END DEBUG LINES ---

    const worldState = gameState?.worldState || {};
    const flattenedWorld = useMemo(() => {
        const flat = flattenJsonObject(worldState);
        debugLog('[useWorldStateViewLogic.ts] Calculated flattenedWorld (inside useMemo):', JSON.stringify(flat, null, 2));
        debugLog('[useWorldStateViewLogic.ts] Flattened World keys length (inside useMemo):', Object.keys(flat).length);
        return flat;
    }, [worldState]);

    const groupedByCategory = useMemo(() => {
        const grouped: GroupedWorldState = {};
        for (const fullKey in flattenedWorld) {
            const value = flattenedWorld[fullKey];
            const parts = fullKey.split(".");
            if (parts.length < 1) continue;

            const category = parts[0];
            const entity = (parts.length > 1 && (parts[1].startsWith('#') || parts[1].startsWith('@') || parts[1].startsWith('$'))) ? parts[1] : '@@_direct';
            const variable = (entity === '@@_direct') ? parts.slice(1).join('.') : parts.slice(2).join('.');
            if (!variable) continue;

            grouped[category] = grouped[category] || {};
            grouped[category][entity] = grouped[category][entity] || {};
            grouped[category][entity][variable] = value;
        }
        for (const category in grouped) {
            if (Object.keys(grouped[category]['@@_direct'] || {}).length === 0) {
                delete grouped[category]['@@_direct'];
            }
        }
        debugLog('[useWorldStateViewLogic.ts] Grouped by Category (inside useMemo):', JSON.stringify(grouped, null, 2));
        debugLog('[useWorldStateViewLogic.ts] Grouped by Category keys length (inside useMemo):', Object.keys(grouped).length);
        return grouped;
    }, [flattenedWorld]);

    // Utility to get all variable keys under a given path (entity or category)
    const getAllChildVariableKeys = useCallback((basePath: string): string[] => {
        const nestedData = getNestedValue(worldState, basePath.split('.'));
        if (typeof nestedData !== 'object' || nestedData === null) return [];
        // Flatten the nested data starting from the basePath to get its direct children keys
        return Object.keys(flattenJsonObject(nestedData, basePath));
    }, [worldState]);

    // Memoized checks for pinning status
    const isAnyChildPinned = useCallback((parentPath: string) => {
        return getAllChildVariableKeys(parentPath).some(key => worldStatePinnedKeys.includes(key));
    }, [getAllChildVariableKeys, worldStatePinnedKeys]);

    const areAllChildrenPinned = useCallback((parentPath: string) => {
        const childKeys = getAllChildVariableKeys(parentPath);
        return childKeys.length > 0 && childKeys.every(key => worldStatePinnedKeys.includes(key));
    }, [getAllChildVariableKeys, worldStatePinnedKeys]);

    // Handlers for expanding/collapsing categories and entities
    const handleToggleCategoryExpand = useCallback((category: string) => {
        setExpandedCategories(prev => {
            const newSet = new Set(prev);
            newSet.has(category) ? newSet.delete(category) : newSet.add(category);
            return newSet;
        });
    }, []);

    const handleToggleEntityExpand = useCallback((category: string, entity: string) => {
        const key = `${category}.${entity}`;
        setExpandedEntities(prev => {
            const newSet = new Set(prev);
            newSet.has(key) ? newSet.delete(key) : newSet.add(key);
            return newSet;
        });
    }, []);

    // Handlers for pinning/unpinning
    const handleToggleCategoryPin = useCallback((category: string) => {
        toggleWorldStatePin(category, 'category');
    }, [toggleWorldStatePin]);

    const handleToggleEntityPin = useCallback((entityPath: string) => {
        toggleWorldStatePin(entityPath, 'entity');
    }, [toggleWorldStatePin]);

    // Handlers for renaming category
    const handleStartRenameCategory = useCallback((category: string) => {
        setEditingCategory(category);
        setNewCategoryName(category); // Initialize input with current name
    }, []);

    const handleConfirmRenameCategory = useCallback(async () => {
        if (editingCategory && newCategoryName.trim() && newCategoryName !== editingCategory) {
            await renameWorldCategory(editingCategory, newCategoryName.trim());
        }
        setEditingCategory(null); // Exit edit mode
        setNewCategoryName(''); // Clear input
    }, [editingCategory, newCategoryName, renameWorldCategory]);

    // Handlers for renaming entity
    const handleStartRenameEntity = useCallback((entityPathParts: [string, string]) => { // entityPathParts is [category, entity]
        setEditingEntity(entityPathParts);
        setNewEntityName(entityPathParts[1]); // Initialize input with current entity name
    }, []);

    const handleConfirmRenameEntity = useCallback(async () => {
        if (editingEntity && newEntityName.trim() && newEntityName !== editingEntity[1]) {
            await renameWorldEntity(editingEntity[0], editingEntity[1], newEntityName.trim());
        }
        setEditingEntity(null); // Exit edit mode
        setNewEntityName(''); // Clear input
    }, [editingEntity, newEntityName, renameWorldEntity]);

    // Handler to cancel any edit operation
    const cancelEdit = useCallback(() => {
        setEditingCategory(null);
        setEditingEntity(null);
        setNewCategoryName('');
        setNewEntityName('');
    }, []);

    // 5. Return the clean API
    return {
        // Derived Data
        groupedByCategory,
        worldStatePinnedKeys,
        isAnyChildPinned,
        areAllChildrenPinned,

        // Local UI State
        expandedCategories,
        expandedEntities,
        editingCategory,
        newCategoryName,
        editingEntity,
        newEntityName,

        // Handlers (from store and local)
        handleToggleCategoryExpand,
        handleToggleEntityExpand,
        handleToggleCategoryPin,
        handleToggleEntityPin,
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
        toggleWorldStatePin, // Ensure this is correctly passed if needed elsewhere
    };
};