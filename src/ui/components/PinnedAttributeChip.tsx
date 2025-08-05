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

export const PinnedAttributeChip: React.FC<PinnedAttributeChipProps> = React.memo(
  ({ fullKey, label, value, onUnpin }) => {
    const longPressProps = useLongPress((e) => {
      e.stopPropagation();
      onUnpin(fullKey);
    });

    return (
      <Tooltip title={`Long-press to unpin '${label}'`} key={fullKey}>
        <Chip
          label={`${label}: ${JSON.stringify(value)}`}
          size="small"
          deleteIcon={<PushPinIcon />}
          sx={{
            backgroundColor: (theme) => theme.palette.chipBackground.main, // CHIP_BG_LIGHT/DARK
            color: (theme) => theme.palette.text.primary,
            fontSize: '0.8rem',
            height: '22px',
            '& .MuiChip-label': {
              px: 1,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            },
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
  }
);
