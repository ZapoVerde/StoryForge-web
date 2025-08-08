import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  Collapse,
  Checkbox,
  Divider,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { WorldStateItemRow } from './WorldStateItemRow';
import { flattenJsonObject } from '../../utils/jsonUtils';

interface WorldStateEntityProps {
  categoryName: string;
  entityKey: string;
  entityPath: string;
  variables: Record<string, any>;
  isExpanded: boolean;
  worldStatePinnedKeys: string[];
  onToggleExpand: () => void;
  onTogglePin: () => void;
  onStartRename: () => void;
  onDelete: () => void;
  onDeleteKey: (key: string) => Promise<void>;
  onEditKey: (key: string, value: any) => Promise<void>;
  onToggleVariablePin: (key: string) => void;
}

export const WorldStateEntity: React.FC<WorldStateEntityProps> = ({
  entityPath,
  variables,
  isExpanded,
  worldStatePinnedKeys,
  onToggleExpand,
  onTogglePin,
  onStartRename,
  onDelete,
  onDeleteKey,
  onEditKey,
  onToggleVariablePin,
}) => {
  const childVariableKeys = React.useMemo(
    () => Object.keys(flattenJsonObject(variables, entityPath)),
    [variables, entityPath]
  );

  const areAllChildrenPinned =
    childVariableKeys.length > 0 &&
    childVariableKeys.every((key) => worldStatePinnedKeys.includes(key));

  const isAnyChildPinned =
    childVariableKeys.length > 0 &&
    childVariableKeys.some((key) => worldStatePinnedKeys.includes(key));

  const entityDisplayName = entityPath.split('.').pop() || entityPath;

  return (
    <Box
      sx={{
        mb: 1,
        border: '1px dashed',
        borderColor: 'divider',
        borderRadius: 1,
        mt: 1,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          p: 1,
          cursor: 'pointer',
        }}
        onClick={onToggleExpand}
      >
        <IconButton size="small" sx={{ mr: 1 }}>
          {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
        <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
          {entityDisplayName}
        </Typography>
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onStartRename();
          }}
        >
          <EditIcon fontSize="small" />
        </IconButton>
        <Checkbox
          checked={areAllChildrenPinned}
          indeterminate={isAnyChildPinned && !areAllChildrenPinned}
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin();
          }}
        />
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <DeleteIcon fontSize="small" color="error" />
        </IconButton>
      </Box>
      <Collapse in={isExpanded}>
        <Divider />
        <Box sx={{ p: 1.5 }}>
          {Object.entries(variables).map(([varName, value]) => (
            <WorldStateItemRow
              key={varName}
              itemKey={`${entityPath}.${varName}`}
              value={value}
              onDelete={onDeleteKey}
              onEdit={onEditKey}
              isPinned={worldStatePinnedKeys.includes(`${entityPath}.${varName}`)}
              onTogglePin={() => onToggleVariablePin(`${entityPath}.${varName}`)}
            />
          ))}
        </Box>
      </Collapse>
    </Box>
  );
};
