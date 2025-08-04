// src/ui/components/InfoDialog.tsx

import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, IconButton, Tooltip, Box } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

interface InfoDialogProps {
  title: string;
  content: string | React.ReactNode; // Can be a string or JSX
  iconSize?: 'small' | 'medium' | 'large';
  tooltipText?: string; // Optional text for the initial hover tooltip
}

export const InfoDialog: React.FC<InfoDialogProps> = ({ title, content, iconSize = 'small', tooltipText = "Click for more information" }) => {
  const [open, setOpen] = useState(false);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <>
      <Tooltip title={tooltipText}>
        <IconButton size={iconSize} onClick={handleClickOpen} sx={{ ml: 0.5, p: 0 }}>
          <InfoOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Dialog
        open={open}
        onClose={handleClose}
        aria-labelledby="info-dialog-title"
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle id="info-dialog-title">{title}</DialogTitle>
        <DialogContent dividers>
          {/* Use Box with pre-wrap to respect line breaks in string content */}
          {typeof content === 'string' ? <Box sx={{ whiteSpace: 'pre-wrap' }}>{content}</Box> : content}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};