// vite.config.ts

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc'; // <-- CRUCIAL CHANGE HERE

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // You also have "--host 0.0.0.0 --port 5173" in your package.json dev script.
  // If you want those settings to apply consistently, you can put them here:
  // server: {
  //   host: '0.0.0.0',
  //   port: 5173,
  // }
});