// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';


import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [react()],
  server: {
    // These make sure local dev matches your package.json `vite-dev` script
    host: '0.0.0.0',
    port: 5173,
  },
  preview: {
    // This is the important part for Vercel
    // It tells Vite's preview server (used in production static builds) to
    // fall back to index.html for all unknown routes
    host: '0.0.0.0',
    port: 4173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
  },
  // Enable SPA fallback for dev + preview servers
  // Vite doesn't have a direct `historyApiFallback` option in config,
  // but setting up rewrites in preview works the same way.
  optimizeDeps: {},
});