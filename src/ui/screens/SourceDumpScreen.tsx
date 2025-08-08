// src/ui/screens/SourceDumpScreen.tsx
import React from 'react';
import { Box } from '@mui/material';
import { SourceDumpPanel } from '../components/SourceDumpPanel';

const SourceDumpScreen: React.FC = () => {
return (
<Box p={1}>
<SourceDumpPanel />
</Box>
);
};

export default SourceDumpScreen;