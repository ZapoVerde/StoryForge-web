// vitest.config.ts

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc'; // <-- CRUCIAL CHANGE HERE

export default defineConfig({
  plugins: [react()], // This line is now correct
  test: {
    environment: 'jsdom',
    globals: true,
    coverage: {
      provider: 'c8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/main.tsx', 'src/App.tsx']
    },
    // include: ['**/*.test.ts', '**/*.test.tsx'],
  },
});