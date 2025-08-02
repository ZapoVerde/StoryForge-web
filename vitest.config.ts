// vitest.config.ts (VERIFY THIS FILE IS UNCHANGED)

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    coverage: {
      provider: 'c8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/main.tsx', 'src/App.tsx']
    },
  },
});