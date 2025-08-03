// src/ui/components/WorldStateItemRow.tsx

import React, { useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  TextField,
  InputAdornment,
  Checkbox,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import { parseJsonPrimitive } from '../../utils/jsonUtils';

interface WorldStateItemRowProps {
  itemKey: string; // Full key, e.g., "npcs.goblin_1.hp"
  value: any; // The raw value, JsonElement equivalent
  onDelete: (key: string) => Promise<void>; // Make it async as store actions might be async
  onEdit: (key: string, value: any) => Promise<void>; // Make it async
  isPinned: boolean;
  onTogglePin: (key: string) => void; // This will call the store's toggleWorldStatePin with 'variable' type
}

export const WorldStateItemRow: React.FC<WorldStateItemRowProps> = ({
  itemKey,
  value,
  onDelete,
  onEdit,
  isPinned,
  onTogglePin,
}) => {
  const [editMode, setEditMode] = useState(false);
  const [editText, setEditText] = useState(JSON.stringify(value)); // Use JSON.stringify for complex values

  // Extract the last part of the key for display name
  const displayName = itemKey.substring(itemKey.lastIndexOf('.') + 1);

  const handleEditConfirm = async () => {
    try {
      const parsedValue = parseJsonPrimitive(editText);
      await onEdit(itemKey, parsedValue); // Await the async edit operation
      setEditMode(false);
    } catch (e) {
      console.error("Failed to parse input for world state edit:", e);
      // TODO: Provide user feedback (e.g., Snackbar) for parsing errors
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        mb: 1,
        p: 1,
        borderRadius: 1,
        backgroundColor: (theme) => (editMode ? theme.palette.action.hover : 'transparent'),
      }}
    >
      <Typography variant="body2" sx={{ fontWeight: 'bold', flexShrink: 0 }}>
        {displayName}:
      </Typography>
      <Box sx={{ flexGrow: 1 }}>
        {editMode ? (
          <TextField
            fullWidth
            size="small"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={handleEditConfirm}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleEditConfirm();
              }
            }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={handleEditConfirm}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        ) : (
          <Typography
            variant="body2"
            sx={{
              cursor: 'pointer',
              border: '1px solid',
              borderColor: (theme) => theme.palette.divider,
              borderRadius: 1,
              p: 0.8,
              '&:hover': { backgroundColor: (theme) => theme.palette.action.hover },
            }}
            onClick={() => setEditMode(true)}
          >
            {JSON.stringify(value)}
          </Typography>
        )}
      </Box>
      <Checkbox
        icon={<PushPinOutlinedIcon fontSize="small" />}
        checkedIcon={<PushPinIcon fontSize="small" />}
        checked={isPinned}
        onChange={() => onTogglePin(itemKey)} // Pass the full itemKey
        size="small"
        sx={{ p: 0.5 }}
      />
      <IconButton size="small" onClick={() => onDelete(itemKey)} sx={{ p: 0.5 }}>
        <DeleteIcon fontSize="small" color="error" />
      </IconButton>
    </Box>
  );
};