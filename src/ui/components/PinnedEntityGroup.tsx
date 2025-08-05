// src/ui/components/PinnedEntityGroup.tsx

import React from 'react';
import { Paper, Typography, Stack, Tooltip } from '@mui/material';
import PushPinIcon from '@mui/icons-material/PushPin';
import { useLongPress } from '../../utils/hooks/useLongPress';
import { PinnedAttributeChip } from './PinnedAttributeChip';

interface Attribute {
  label: string;
  value: any;
  fullKey: string;
}

interface PinnedEntityGroupProps {
  entityPath: string;
  attributes: Attribute[];
  onUnpinEntity: (path: string) => void;
  onUnpinVariable: (key: string) => void;
}

export const PinnedEntityGroup: React.FC<PinnedEntityGroupProps> = ({
  entityPath,
  attributes,
  onUnpinEntity,
  onUnpinVariable, // This prop is passed down but also available here
}) => {
  const longPressEntityProps = useLongPress(() => {
    console.log(`[PinnedEntityGroup] Long-pressed entity header: "${entityPath}". Calling onUnpinEntity.`);
    onUnpinEntity(entityPath);
  });

  const entityDisplayName = entityPath.includes('.')
    ? entityPath.split('.').pop()?.replace(/^[#@$]/, '')
    : entityPath;

  return (
    <Paper
      elevation={3}
      sx={{
        p: 1.5,
        minWidth: 150,
        backgroundColor: (theme) => theme.palette.primary.light,
        color: (theme) => theme.palette.primary.contrastText,
        flexShrink: 0,
        cursor: 'pointer',
      }}
      {...longPressEntityProps}
    >
      <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
        {entityDisplayName}
        <Tooltip title="Long-press to unpin all for this group">
          <PushPinIcon fontSize="small" sx={{ verticalAlign: 'middle', ml: 0.5 }} />
        </Tooltip>
      </Typography>
      <Stack direction="column" spacing={0.5} sx={{ mt: 1 }}>
        {attributes.map(attr => (
          <PinnedAttributeChip
            key={attr.fullKey}
            fullKey={attr.fullKey}
            label={attr.label}
            value={attr.value}
            onUnpin={onUnpinVariable} // This is correct, passing the specific unpin variable function
          />
        ))}
      </Stack>
    </Paper>
  );
};