import react from '@vitejs/plugin-react';
import * as path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const landscapeTarget =
    env.VITE_LANDSCAPE_SERV_URL || 'http://localhost:8085';
  const codeAnalyzerTarget =
    env.VITE_CODE_ANALYZER_URL || 'http://localhost:8078';

  return {
    plugins: [
      react({
        babel: {
          plugins: ['babel-plugin-react-compiler'],
        },
      }),
    ],
    resolve: {
      alias: {
        '~bootstrap': path.resolve(__dirname, 'node_modules/bootstrap'),
        'explorviz-frontend': path.resolve(__dirname),
      },
    },
    server: {
      port: 4200,
      proxy: {
        '/api/analysis': {
          target: codeAnalyzerTarget,
          changeOrigin: true,
        },
        '/api': {
          target: 'http://localhost:9123',
          changeOrigin: true,
        },
        '/v3/landscapes': {
          target: landscapeTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
