// src/ui/components/PinnedAttributeChip.tsx

import React from 'react'; // Keep React import
import { Chip, Tooltip } from '@mui/material';
import PushPinIcon from '@mui/icons-material/PushPin';
import { useLongPress } from '../../utils/hooks/useLongPress';

interface PinnedAttributeChipProps {
  fullKey: string;
  label: string;
  value: any;
  onUnpin: (key: string) => void;
}

// Wrap the component with React.memo

export const PinnedAttributeChip: React.FC<PinnedAttributeChipProps> = React.memo(({
  fullKey,
  label,
  value,
  onUnpin,
}) => {
  console.log(`[PinnedAttributeChip:${fullKey}] Rendering/Re-rendering.`);

  const longPressProps = useLongPress((e) => {
    e.stopPropagation(); // Double safety — ensures no parent listener fires
    console.log(`[PinnedAttributeChip] Long-pressed individual variable: "${fullKey}". Calling onUnpin (unpinIndividualVariable).`);
    onUnpin(fullKey);
  });

  return (
    <Tooltip title={`Long-press to unpin '${label}'`} key={fullKey}>
      <Chip
        label={`${label}: ${JSON.stringify(value)}`}
        size="small"
        deleteIcon={<PushPinIcon />}
        sx={{
          backgroundColor: (theme) => theme.palette.background.paper,
          color: (theme) => theme.palette.text.primary,
          cursor: 'pointer',
          '& .MuiChip-deleteIcon': {
            opacity: 0.2,
          },
          '&:hover .MuiChip-deleteIcon': {
            opacity: 1,
          },
        }}
        {...longPressProps}
      />
    </Tooltip>
  );
});