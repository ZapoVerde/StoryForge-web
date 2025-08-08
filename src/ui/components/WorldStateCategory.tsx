import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  Collapse,
  Checkbox,
  List,
  Divider,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { WorldStateEntity } from './WorldStateEntity';
import { WorldStateItemRow } from './WorldStateItemRow';

interface WorldStateCategoryProps {
  categoryName: string;
  entities: Record<string, Record<string, any>>;
  isExpanded: boolean;
  areAllChildrenPinned: boolean;
  isAnyChildPinned: boolean;
  expandedEntities: Set<string>;
  worldStatePinnedKeys: string[];
  onToggleExpand: () => void;
  onTogglePin: () => void;
  onStartRename: () => void;
  onDelete: () => void;
  // Entity-level handlers
  onToggleEntityExpand: (entityKey: string) => void;
  onToggleEntityPin: (entityPath: string) => void;
  onStartRenameEntity: (category: string, entity: string) => void;
  onDeleteEntity: (category: string, entity: string) => void;
  // Variable-level handlers
  onDeleteKey: (key: string) => Promise<void>;
  onEditKey: (key: string, value: any) => Promise<void>;
  onToggleVariablePin: (key: string) => void;
}

export const WorldStateCategory: React.FC<WorldStateCategoryProps> = ({
  categoryName,
  entities,
  isExpanded,
  areAllChildrenPinned,
  isAnyChildPinned,
  expandedEntities,
  worldStatePinnedKeys,
  onToggleExpand,
  onTogglePin,
  onStartRename,
  onDelete,
  onToggleEntityExpand,
  onToggleEntityPin,
  onStartRenameEntity,
  onDeleteEntity,
  onDeleteKey,
  onEditKey,
  onToggleVariablePin,
}) => {
  return (
    <Box
      sx={{
        mb: 2,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          p: 1.5,
          cursor: 'pointer',
          backgroundColor: 'action.hover',
        }}
        onClick={onToggleExpand}
      >
        <IconButton size="small" sx={{ mr: 1 }}>
          {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          {categoryName}
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
        <List component="div" disablePadding sx={{ pl: 2, pr: 1, pt: 1 }}>
          {Object.entries(entities).map(([entityKey, variables]) => {
            const entityPath = `${categoryName}.${entityKey}`;

            if (entityKey === '@@_direct') {
              return Object.entries(variables).map(([varName, value]) => (
                <WorldStateItemRow
                  key={`${categoryName}.${varName}`}
                  itemKey={`${categoryName}.${varName}`}
                  value={value}
                  onDelete={onDeleteKey}
                  onEdit={onEditKey}
                  isPinned={worldStatePinnedKeys.includes(`${categoryName}.${varName}`)}
                  onTogglePin={onToggleVariablePin}
                />
              ));
            }

            return (
              <WorldStateEntity
                key={entityPath}
                categoryName={categoryName}
                entityKey={entityKey}
                entityPath={entityPath}
                variables={variables}
                isExpanded={expandedEntities.has(entityPath)}
                worldStatePinnedKeys={worldStatePinnedKeys}
                onToggleExpand={() => onToggleEntityExpand(entityPath)}
                onTogglePin={() => onToggleEntityPin(entityPath)}
                onStartRename={() => onStartRenameEntity(categoryName, entityKey)}
                onDelete={() => onDeleteEntity(categoryName, entityKey)}
                onDeleteKey={onDeleteKey}
                onEditKey={onEditKey}
                onToggleVariablePin={onToggleVariablePin}
              />
            );
          })}
        </List>
      </Collapse>
    </Box>
  );
};
