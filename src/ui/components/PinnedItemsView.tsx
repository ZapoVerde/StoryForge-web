// src/ui/components/PinnedItemsView.tsx
import React, { useEffect, useCallback } from 'react'; // Add useCallback
import { Box, Typography, Paper, Stack } from '@mui/material';
import type { GameState } from '../../models';
// Import the specific selectors for cleaner access and better type inference
import { useGameStateStore, selectWorldStatePinnedKeys } from '../../state/useGameStateStore';
import { flattenJsonObject, getNestedValue } from '../../utils/jsonUtils'; // Ensure getNestedValue is imported
import { PinnedEntityGroup } from './PinnedEntityGroup';

interface PinnedItemsViewProps {
  gameState: GameState;
}

export const PinnedItemsView: React.FC<PinnedItemsViewProps> = React.memo(
  ({ gameState }) => {
    // Correctly select worldStatePinnedKeys using the selector.
    // This ensures it comes from the currentSnapshot and is typed as string[].
    const worldStatePinnedKeys = useGameStateStore(selectWorldStatePinnedKeys);
    // Directly get the action from the store for stability
    const toggleWorldStatePin = useGameStateStore(state => state.toggleWorldStatePin);

    // IMPORTANT: Ensure this `worldState` is the actual, current GameState from the prop.
    // We're relying on `gameState` prop being updated by GameScreen
    const worldState = gameState?.worldState || {};

    // --- ADD THESE NEW DEBUG LINES HERE ---
    console.log('%c[PinnedItemsView.tsx] Component re-rendered (from GameScreen).', 'color: #8B4513; font-weight: bold;');
    console.log('[PinnedItemsView.tsx] Received gameState prop:', JSON.stringify(gameState, null, 2));
    console.log('[PinnedItemsView.tsx] Extracted worldState from prop (gameState?.worldState):', JSON.stringify(worldState, null, 2));
    console.log('[PinnedItemsView.tsx] Extracted worldState keys length (gameState?.worldState):', Object.keys(worldState).length);
    console.log('[PinnedItemsView.tsx] worldStatePinnedKeys from store directly:', worldStatePinnedKeys);
    // --- END NEW DEBUG LINES ---

    // Memoize the flattened world state. This should only re-run if the gameState.worldState object reference changes.
    const flattenedWorld = React.useMemo(() => {
      return flattenJsonObject(worldState);
    }, [worldState]); // Depend on the worldState object itself


    // Memoize the list of items to be displayed (key-value pairs)
    // This is the array that feeds into the grouping logic.
    const pinnedItems = React.useMemo(() => {
      // Filter `worldStatePinnedKeys` directly from the store based on `flattenedWorld`'s existence
      const items = worldStatePinnedKeys
        .map((key: string) => ({ // Explicitly type 'key'
          key,
          value: flattenedWorld[key], // Access value from the memoized flattened object
        }))
        .filter((item: { key: string; value: any }) => { // Explicitly type 'item'
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
      // --- ADD THESE NEW DEBUG LINES HERE ---
    console.log('%c[PinnedItemsView.tsx] Component re-rendered (from GameScreen).', 'color: #8B4513; font-weight: bold;');
    console.log('[PinnedItemsView.tsx] Received gameState prop:', JSON.stringify(gameState, null, 2));
    console.log('[PinnedItemsView.tsx] Extracted worldState from prop (gameState?.worldState):', JSON.stringify(worldState, null, 2));
    console.log('[PinnedItemsView.tsx] Extracted worldState keys length (gameState?.worldState):', Object.keys(worldState).length);
    console.log('[PinnedItemsView.tsx] worldStatePinnedKeys from store directly:', worldStatePinnedKeys);
    // --- END NEW DEBUG LINES ---
      return grouped;
    }, [pinnedItems]); // Recalculate if pinnedItems array changes

    // Define memoized callbacks for unpinning, using the correct store action
    const handleUnpinEntity = useCallback((entityPath: string) => {
        toggleWorldStatePin(entityPath, 'entity');
    }, [toggleWorldStatePin]);

    const handleUnpinVariable = useCallback((key: string) => {
        toggleWorldStatePin(key, 'variable');
    }, [toggleWorldStatePin]);


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
          onUnpinEntity={handleUnpinEntity} // Use the new memoized callback
          onUnpinVariable={handleUnpinVariable} // Use the new memoized callback
        />
      ))}
    </Stack>
  );
});