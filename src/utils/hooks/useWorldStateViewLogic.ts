// src/utils/hooks/useWorldStateViewLogic.ts
import { useState, useMemo, useCallback } from 'react';
import { useGameStateStore } from '../../state/useGameStateStore';
import { flattenJsonObject, getNestedValue } from '../../utils/jsonUtils';
import { GameState } from '../../models';

interface GroupedWorldState {
    [category: string]: {
        [entity: string]: {
            [variable: string]: any;
        };
    };
}

export const useWorldStateViewLogic = (gameState: GameState | null) => {
    // 1. Get the global state actions we need from the store
    const {
        worldStatePinnedKeys,
        toggleWorldStatePin,
        renameWorldCategory,
        renameWorldEntity,
        deleteWorldCategory,
        deleteWorldEntity,
        editWorldKeyValue,
        deleteWorldKey,
    } = useGameStateStore();

    // 2. Move all local UI state here
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
    const [expandedEntities, setExpandedEntities] = useState<Set<string>>(new Set());
    const [editingCategory, setEditingCategory] = useState<string | null>(null);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [editingEntity, setEditingEntity] = useState<[string, string] | null>(null);
    const [newEntityName, setNewEntityName] = useState('');

    // 3. Move all memoized calculations here
    const worldState = gameState?.worldState || {};
    const flattenedWorld = useMemo(() => flattenJsonObject(worldState), [worldState]);

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

    // 4. Move all callback handlers here
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

    const handleToggleCategoryPin = useCallback((category: string) => {
        toggleWorldStatePin(category, 'category');
    }, [toggleWorldStatePin]);

    const handleToggleEntityPin = useCallback((entityPath: string) => {
        toggleWorldStatePin(entityPath, 'entity');
    }, [toggleWorldStatePin]);

    const handleConfirmRenameCategory = useCallback(async () => {
        if (editingCategory && newCategoryName.trim() && newCategoryName !== editingCategory) {
            await renameWorldCategory(editingCategory, newCategoryName);
        }
        setEditingCategory(null);
    }, [editingCategory, newCategoryName, renameWorldCategory]);

    const handleConfirmRenameEntity = useCallback(async () => {
        if (editingEntity && newEntityName.trim() && newEntityName !== editingEntity[1]) {
            await renameWorldEntity(editingEntity[0], editingEntity[1], newEntityName);
        }
        setEditingEntity(null);
    }, [editingEntity, newEntityName, renameWorldEntity]);


    // 5. Return the clean API
    return {
        // Derived Data
        groupedByCategory,
        worldStatePinnedKeys,
        isAnyChildPinned,
        areAllChildrenPinned,

        // UI State
        expandedCategories,
        expandedEntities,
        editingCategory,
        newCategoryName,
        editingEntity,
        newEntityName,

        // Handlers from Store
        renameWorldEntity,
        deleteWorldCategory,
        deleteWorldEntity,
        editWorldKeyValue,
        deleteWorldKey,
        toggleWorldStatePin,

        // Local UI Handlers
        handleToggleCategoryExpand,
        handleToggleEntityExpand,
        handleToggleCategoryPin,
        handleToggleEntityPin,
        handleStartRenameCategory: setEditingCategory,
        handleConfirmRenameCategory,
        setNewCategoryName,
        handleStartRenameEntity: setEditingEntity,
        handleConfirmRenameEntity,
        setNewEntityName,
        cancelEdit: () => {
          setEditingCategory(null);
          setEditingEntity(null);
        },
    };
};