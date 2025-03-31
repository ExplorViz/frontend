import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import * as path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '~bootstrap': path.resolve(__dirname, 'node_modules/bootstrap'),
      "explorviz-frontend": path.resolve(__dirname),
    "*": ["types/*"]
    },
  },
  server: {
    port: 4200,
  },
});
