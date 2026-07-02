import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 9000,
    // Removed proxy to call backend directly
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
