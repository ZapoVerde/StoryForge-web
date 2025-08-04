// src/ui/components/PinnedAttributeChip.tsx

import React from 'react';
import { Chip, Tooltip } from '@mui/material';
import PushPinIcon from '@mui/icons-material/PushPin';
import { useLongPress } from '../../utils/hooks/useLongPress';

interface PinnedAttributeChipProps {
  fullKey: string;
  label: string;
  value: any;
  onUnpin: (key: string) => void;
}

export const PinnedAttributeChip: React.FC<PinnedAttributeChipProps> = ({
  fullKey,
  label,
  value,
  onUnpin,
}) => {
  // CORRECT: Hook is at the top level of this component.
  // It calls the onUnpin function for this specific key.
  const longPressProps = useLongPress(() => onUnpin(fullKey), undefined, { delay: 500 });

  return (
    <Tooltip title={`Long-press to unpin '${label}'`} key={fullKey}>
      <Chip
        label={`${label}: ${JSON.stringify(value)}`}
        size="small"
        deleteIcon={<PushPinIcon />} // Using deleteIcon to show the pin visually
        sx={{
          backgroundColor: (theme) => theme.palette.background.paper,
          color: (theme) => theme.palette.text.primary,
          cursor: 'pointer', // Add cursor to indicate it's interactive
          '& .MuiChip-deleteIcon': {
            opacity: 0.2,
          },
          '&:hover .MuiChip-deleteIcon': {
            opacity: 1,
          },
        }}
        {...longPressProps} // Spread the long-press event handlers onto the Chip
      />
    </Tooltip>
  );
};