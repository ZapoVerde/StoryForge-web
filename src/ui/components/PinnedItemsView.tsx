// src/ui/components/PinnedItemsView.tsx

import React, { useEffect } from 'react';
import { Box, Typography, Paper, Stack } from '@mui/material';
import { GameState } from '../../models/GameState';
import { useGameStateStore } from '../../state/useGameStateStore';
import { flattenJsonObject, getNestedValue } from '../../utils/jsonUtils'; // Ensure getNestedValue is imported
import { PinnedEntityGroup } from './PinnedEntityGroup';

interface PinnedItemsViewProps {
  gameState: GameState;
}

export const PinnedItemsView: React.FC<PinnedItemsViewProps> = ({ gameState }) => {
  // Directly select worldStatePinnedKeys and the actions from the store
  // Make sure currentGameState is destructured here if you use it in the component's render or memoized values.
  const { worldStatePinnedKeys, unpinAllForEntity, unpinIndividualVariable } = useGameStateStore();

  // IMPORTANT: Ensure this `worldState` is the actual, current GameState from the prop.
  // We're relying on `gameState` prop being updated by GameScreen
  const worldState = gameState?.worldState || {};

  // Memoize the flattened world state. This should only re-run if the gameState.worldState object reference changes.
  const flattenedWorld = React.useMemo(() => {
    return flattenJsonObject(worldState);
  }, [worldState]); // Depend on the worldState object itself


  // Memoize the list of items to be displayed (key-value pairs)
  // This is the array that feeds into the grouping logic.
  const pinnedItems = React.useMemo(() => {
    // Filter `worldStatePinnedKeys` directly from the store based on `flattenedWorld`'s existence
    const items = worldStatePinnedKeys
      .map(key => ({
        key,
        value: flattenedWorld[key], // Access value from the memoized flattened object
      }))
      .filter(item => {
          // This filter is critical. An item should only be considered if its value is not undefined.
          // This handles cases where a pinned item might no longer exist in the worldState.
          return item.value !== undefined;
      });

      console.log("[PinnedItemsView:pinnedItems] Calculated pinnedItems. Length:", items.length, "Items:", items);
      return items;
  }, [worldStatePinnedKeys, flattenedWorld]); // Depend on both for re-calculation

  // Grouped pinned items logic
  const groupedPinnedItems = React.useMemo(() => {
    const grouped: { [entityPath: string]: { label: string; value: any; fullKey: string }[] } = {};
    pinnedItems.forEach(item => {
      const parts = item.key.split('.');
      if (parts.length >= 2) {
        const secondPart = parts[1];
        const isTaggedEntity = secondPart.startsWith('#') || secondPart.startsWith('@') || secondPart.startsWith('$');
        let entityPath: string;
        let label: string;

        if (parts.length >= 3 && isTaggedEntity) {
          entityPath = parts.slice(0, 2).join('.');
          label = parts.slice(2).join('.');
        } else {
          entityPath = parts[0];
          label = parts.slice(1).join('.');
        }

        // This fallback might have been the source of the 31 vs 32 discrepancy if a root-level key was accidentally pinned as a variable
        // but based on your logs, all pinned keys seem deeply nested. Let's keep it robust.
        if (label === '') {
          label = parts[parts.length - 1]; // Fallback, e.g., if key is "world"
        }

        grouped[entityPath] = grouped[entityPath] || [];
        grouped[entityPath].push({ label, value: item.value, fullKey: item.key });
      }
    });
    // Sort attributes within each group for consistent rendering
    Object.keys(grouped).forEach(entityPath => {
      grouped[entityPath].sort((a, b) => a.label.localeCompare(b.label));
    });
    console.log("[PinnedItemsView] Grouped Pinned Items (re-calculated):", grouped); // Updated log message
    return grouped;
  }, [pinnedItems]); // Recalculate if pinnedItems array changes

  // Logging effect for re-renders and key count
  useEffect(() => {
    console.log("[PinnedItemsView] Component re-rendered. Current worldStatePinnedKeys (from store):", worldStatePinnedKeys);
    console.log("[PinnedItemsView] Number of pinned keys (from store):", worldStatePinnedKeys.length);
    console.log("[PinnedItemsView] Number of calculated pinnedItems (filtered):", pinnedItems.length);
    console.log("[PinnedItemsView] Number of grouped entities:", Object.keys(groupedPinnedItems).length);
    let totalGroupedItems = 0;
    Object.values(groupedPinnedItems).forEach(arr => totalGroupedItems += arr.length);
    console.log("[PinnedItemsView] Total items in groupedPinnedItems:", totalGroupedItems);

  }, [worldStatePinnedKeys, pinnedItems, groupedPinnedItems]); // Added pinnedItems to dependency

  if (pinnedItems.length === 0) { // Check length of `pinnedItems` (the filtered list)
    return (
      <Paper elevation={0} sx={{ p: 1.5, mt: 1, backgroundColor: (theme) => theme.palette.background.default }}>
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
          No items pinned. Right-click or long-press items in the World State screen to pin them here.
        </Typography>
      </Paper>
    );
  }

  return (
    <Stack
      direction="row"
      spacing={2}
      sx={{
        py: 1,
        overflowX: 'auto',
        backgroundColor: 'transparent',
      }}
    >
      {Object.entries(groupedPinnedItems).map(([entityPath, attributes]) => (
        <PinnedEntityGroup
          key={entityPath} // Keying by entityPath is correct for entity groups
          entityPath={entityPath}
          attributes={attributes}
          onUnpinEntity={unpinAllForEntity}
          onUnpinVariable={unpinIndividualVariable}
        />
      ))}
    </Stack>
  );
};