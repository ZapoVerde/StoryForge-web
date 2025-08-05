// src/ui/components/PinnedItemsView.tsx

import React from 'react';
import { Box, Typography, Paper, Stack } from '@mui/material'; // Keep Paper here for PinnedEntityGroup, but remove its usage around Stack
import { GameState } from '../../models/GameState';
import { useGameStateStore } from '../../state/useGameStateStore';
import { flattenJsonObject } from '../../utils/jsonUtils';
import { PinnedEntityGroup } from './PinnedEntityGroup';

interface PinnedItemsViewProps {
  gameState: GameState;
}

export const PinnedItemsView: React.FC<PinnedItemsViewProps> = ({ gameState }) => {
  const { worldStatePinnedKeys, unpinAllForEntity, unpinIndividualVariable } = useGameStateStore();

  const flattenedWorld = React.useMemo(() => flattenJsonObject(gameState.worldState), [gameState.worldState]);

  const pinnedItems = worldStatePinnedKeys
    .map(key => ({ key, value: flattenedWorld[key] }))
    .filter(item => item.value !== undefined);

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
        grouped[entityPath] = grouped[entityPath] || [];
        grouped[entityPath].push({ label, value: item.value, fullKey: item.key });
      }
    });
    return grouped;
  }, [pinnedItems]);

  if (pinnedItems.length === 0) {
    // Keep this Paper if you want the "No items pinned" message to have a background
    // Or you can make it a simple Typography if you want it to float as well.
    // For now, keeping it as a Paper to be visible.
    return (
      <Paper elevation={0} sx={{ p: 1.5, mt: 1, backgroundColor: (theme) => theme.palette.background.default }}>
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
          No items pinned. Right-click or long-press items in the World State screen to pin them here.
        </Typography>
      </Paper>
    );
  }

  return (
    // Removed the outer Paper here. Now just the Stack.
    <Stack
      direction="row"
      spacing={2}
      sx={{
        py: 1,
        // Added overflowX: 'auto' here directly to the Stack,
        // as the Paper that previously held it is gone.
        // This ensures horizontal scrolling for pinned items.
        overflowX: 'auto',
        // Important: background must be transparent here to allow text to show through
        backgroundColor: 'transparent',
        // Remove padding if the parent Box in GameScreen handles it
        // Or keep it if you want internal padding for the stack.
        // For 'floating tiles', typically the wrapper for the tiles itself is not styled.
        // The individual tiles carry their own styles.
      }}
    >
      {Object.entries(groupedPinnedItems).map(([entityPath, attributes]) => (
        <PinnedEntityGroup
          key={entityPath}
          entityPath={entityPath}
          attributes={attributes}
          onUnpinEntity={unpinAllForEntity}
          onUnpinVariable={unpinIndividualVariable}
        />
      ))}
    </Stack>
  );
};