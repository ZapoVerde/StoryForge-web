// src/config/navigation.ts
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import StyleIcon from '@mui/icons-material/Style';
import SettingsIcon from '@mui/icons-material/Settings';
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import HistoryIcon from '@mui/icons-material/History';
import DataObjectIcon from '@mui/icons-material/DataObject';
import CodeIcon from '@mui/icons-material/Code';
import { GameSnapshot } from '../models';

/**
 * Generates the navigation items array.
 * @param currentSnapshot - The current game snapshot, used to determine if game-specific links should be enabled.
 * @returns An array of navigation item objects.
 */
export const getNavItems = (currentSnapshot: GameSnapshot | null) => [
  { text: 'Game Library', icon: <LibraryBooksIcon />, path: '/library', requiresAuth: true, requiresGame: false, disabled: false },
  { text: 'Prompt Cards', icon: <StyleIcon />, path: '/cards', requiresAuth: true, requiresGame: false, disabled: false },
  { text: 'Settings', icon: <SettingsIcon />, path: '/settings', requiresAuth: true, requiresGame: false, disabled: false },
  { text: 'Current Game', icon: <TravelExploreIcon />, path: '/game', requiresAuth: true, requiresGame: true, disabled: !currentSnapshot },
  { text: 'World State', icon: <DataObjectIcon />, path: '/world-state', requiresAuth: true, requiresGame: true, disabled: !currentSnapshot },
  { text: 'Log Viewer', icon: <HistoryIcon />, path: '/logs', requiresAuth: true, requiresGame: true, disabled: !currentSnapshot },
  { text: 'Source Dump', icon: <CodeIcon />, path: '/sourcedump', requiresAuth: false, requiresGame: false, disabled: false },
];