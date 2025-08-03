// src/ui/components/PinnedItemsView.tsx

import React from 'react';
import { Box, Typography, Paper, Chip, Stack, Tooltip } from '@mui/material';
import PushPinIcon from '@mui/icons-material/PushPin';
import { GameState } from '../../models/GameState';
import { useGameStateStore } from '../../state/useGameStateStore';
import { flattenJsonObject } from '../../utils/jsonUtils';
import { useLongPress } from '../../utils/hooks/useLongPress'; // Import the new hook

interface PinnedItemsViewProps {
  gameState: GameState;
}

export const PinnedItemsView: React.FC<PinnedItemsViewProps> = ({ gameState }) => {
  const { worldStatePinnedKeys, unpinAllForEntity, unpinIndividualVariable } = useGameStateStore();

  const flattenedWorld = React.useMemo(() => flattenJsonObject(gameState.worldState), [gameState.worldState]);

  const pinnedItems = worldStatePinnedKeys
    .map(key => ({
      key,
      value: flattenedWorld[key],
    }))
    .filter(item => item.value !== undefined);

  // Group by entity for better display
  const groupedPinnedItems = React.useMemo(() => {
    const grouped: { [entityPath: string]: { label: string; value: any; fullKey: string }[] } = {};
    pinnedItems.forEach(item => {
      const parts = item.key.split('.');
      if (parts.length >= 2) {
        // Handle categories with no explicit entity (e.g., 'inventory.sword')
        const secondPart = parts[1];
        const isTaggedEntity = secondPart.startsWith('#') || secondPart.startsWith('@') || secondPart.startsWith('$');

        let entityPath: string;
        let label: string;

        if (parts.length >= 3 && isTaggedEntity) {
          entityPath = parts.slice(0, 2).join('.'); // e.g., "npcs.#fox"
          label = parts.slice(2).join('.');       // e.g., "hp"
        } else {
          // If no distinct entity or not tagged, group directly under category
          entityPath = parts[0]; // e.g., "inventory"
          label = parts.slice(1).join('.'); // e.g., "sword"
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
          No items pinned to world state. Checkbox or long-press items in World State screen to pin.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper elevation={1} sx={{ p: 1.5, mt: 1, backgroundColor: (theme) => theme.palette.grey[100], overflowX: 'auto', display: 'flex' }}>
      <Stack direction="row" spacing={2} sx={{ py: 1 }}> {/* Use Stack for horizontal scrollable layout */}
        {Object.entries(groupedPinnedItems).map(([entityPath, attributes]) => {
          // Determine display name for the entity/category card
          const entityDisplayName = entityPath.includes('.')
            ? entityPath.split('.').pop()?.replace(/^[#@$]/, '') // For entities like npcs.#fox -> fox
            : entityPath; // For categories like inventory

          const longPressEntityProps = useLongPress(() => unpinAllForEntity(entityPath), undefined, { delay: 500 });

          return (
            <Paper
              key={entityPath}
              elevation={3}
              sx={{
                p: 1.5,
                minWidth: 150, // Ensure cards have some minimum width
                backgroundColor: (theme) => theme.palette.primary.light,
                color: (theme) => theme.palette.primary.contrastText,
                flexShrink: 0, // Prevent shrinking in the flex container
              }}
              {...longPressEntityProps} // Apply long press to the entity card
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                {entityDisplayName}
                <Tooltip title="Long-press to unpin all for this group">
                    <PushPinIcon fontSize="small" sx={{ verticalAlign: 'middle', ml: 0.5 }} />
                </Tooltip>
              </Typography>
              <Stack direction="column" spacing={0.5} sx={{ mt: 1 }}>
                {attributes.map(attr => {
                  const longPressVariableProps = useLongPress(() => unpinIndividualVariable(attr.fullKey), undefined, { delay: 500 });
                  return (
                    <Tooltip title={`Long-press to unpin '${attr.label}'`} key={attr.fullKey}>
                      <Chip
                        label={`${attr.label}: ${JSON.stringify(attr.value)}`}
                        size="small"
                        // onDelete={() => unpinIndividualVariable(attr.fullKey)} // Delete on click not long press
                        deleteIcon={<PushPinIcon />}
                        sx={{
                          backgroundColor: (theme) => theme.palette.background.paper,
                          color: (theme) => theme.palette.text.primary,
                          '& .MuiChip-deleteIcon': { // Make pin icon clickable on hover only
                            opacity: 0.2, // Make it semi-transparent by default
                          },
                          '&:hover .MuiChip-deleteIcon': {
                            opacity: 1, // Make fully visible on hover
                          }
                        }}
                        {...longPressVariableProps} // Apply long press to the individual chip
                      />
                    </Tooltip>
                  );
                })}
              </Stack>
            </Paper>
          );
        })}
      </Stack>
    </Paper>
  );
};