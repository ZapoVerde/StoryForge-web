import React, { useEffect, useCallback } from 'react';
import { Box, Typography, Paper, Stack } from '@mui/material';
import {
  useGameStateStore,
  selectCurrentGameState,
  selectWorldStatePinnedKeys
} from '../../state/useGameStateStore';
import { flattenJsonObject } from '../../utils/jsonUtils';
import { PinnedEntityGroup } from './PinnedEntityGroup';

export const PinnedItemsView: React.FC = React.memo(() => {
  const gameState = useGameStateStore(selectCurrentGameState);
  const worldStatePinnedKeys = useGameStateStore(selectWorldStatePinnedKeys);
  const toggleWorldStatePin = useGameStateStore(state => state.toggleWorldStatePin);

  const worldState = gameState?.worldState || {};

  const flattenedWorld = React.useMemo(() => {
    return flattenJsonObject(worldState);
  }, [worldState]);

  const pinnedItems = React.useMemo(() => {
    const items = worldStatePinnedKeys
      .map((key: string) => ({
        key,
        value: flattenedWorld[key],
      }))
      .filter(item => item.value !== undefined);

    return items;
  }, [worldStatePinnedKeys, flattenedWorld]);

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

        if (label === '') {
          label = parts[parts.length - 1];
        }

        grouped[entityPath] = grouped[entityPath] || [];
        grouped[entityPath].push({ label, value: item.value, fullKey: item.key });
      }
    });

    Object.keys(grouped).forEach(entityPath => {
      grouped[entityPath].sort((a, b) => a.label.localeCompare(b.label));
    });

    return grouped;
  }, [pinnedItems]);

  const handleUnpinEntity = useCallback((entityPath: string) => {
    toggleWorldStatePin(entityPath, 'entity');
  }, [toggleWorldStatePin]);

  const handleUnpinVariable = useCallback((key: string) => {
    toggleWorldStatePin(key, 'variable');
  }, [toggleWorldStatePin]);

  useEffect(() => {
    console.log("[PinnedItemsView] Re-rendered");
    console.log("Pinned keys:", worldStatePinnedKeys);
    console.log("Total grouped items:", Object.keys(groupedPinnedItems).length);
  }, [worldStatePinnedKeys, pinnedItems, groupedPinnedItems]);

  if (pinnedItems.length === 0) {
    return (
      <Paper
        elevation={0}
        sx={{ p: 1.5, mt: 1, backgroundColor: (theme) => theme.palette.background.default }}
      >
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
          key={entityPath}
          entityPath={entityPath}
          attributes={attributes}
          onUnpinEntity={handleUnpinEntity}
          onUnpinVariable={handleUnpinVariable}
        />
      ))}
    </Stack>
  );
});
