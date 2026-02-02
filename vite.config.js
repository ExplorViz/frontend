import react from '@vitejs/plugin-react';
import * as path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '~bootstrap': path.resolve(__dirname, 'node_modules/bootstrap'),
      'explorviz-frontend': path.resolve(__dirname),
      '*': ['types/*'],
    },
  },
  server: {
    port: 4200,
    proxy: {
      '/api': {
        target: 'http://localhost:9123',
        changeOrigin: true,
      },
    },
  },
});
