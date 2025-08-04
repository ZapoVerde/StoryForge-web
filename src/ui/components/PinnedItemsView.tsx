// src/ui/components/PinnedItemsView.tsx

import React from 'react';
import { Box, Typography, Paper, Stack } from '@mui/material';
import { GameState } from '../../models/GameState';
import { useGameStateStore } from '../../state/useGameStateStore';
import { flattenJsonObject } from '../../utils/jsonUtils';
// ADD THIS IMPORT for the new group component
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
    return (
      <Paper elevation={0} sx={{ p: 1.5, mt: 1, backgroundColor: (theme) => theme.palette.background.default }}>
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
          No items pinned. Right-click or long-press items in the World State screen to pin them here.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper elevation={1} sx={{ p: 1.5, mt: 1, overflowX: 'auto', display: 'flex' }}>
      <Stack direction="row" spacing={2} sx={{ py: 1 }}>
        {Object.entries(groupedPinnedItems).map(([entityPath, attributes]) => (
          // Use the new PinnedEntityGroup component and pass down the store functions
          <PinnedEntityGroup
            key={entityPath}
            entityPath={entityPath}
            attributes={attributes}
            onUnpinEntity={unpinAllForEntity}
            onUnpinVariable={unpinIndividualVariable}
          />
        ))}
      </Stack>
    </Paper>
  );
};