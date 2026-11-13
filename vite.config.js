import react from '@vitejs/plugin-react';
import * as path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const landscapeTarget = env.LANDSCAPE_SERV_URL || env.VITE_LANDSCAPE_SERV_URL || 'http://localhost:8085';
  const codeAnalyzerTarget = env.CODE_ANALYZER_URL || env.VITE_CODE_ANALYZER_URL || 'http://localhost:8078';
  const traceTarget = env.TRACE_SERV_URL || env.VITE_TRACE_SERV_URL || 'http://localhost:8081';
  const metricsTarget = env.METRICS_SERV_URL || env.VITE_METRICS_SERV_URL || 'http://localhost:8082';
  const logTarget = env.LOG_SERV_URL || env.VITE_LOG_SERV_URL || 'http://localhost:8083';

  const userTarget = env.USER_SERV_URL || env.VITE_USER_SERV_URL || 'http://localhost:8084';
  const collaborationTarget = env.COLLAB_SERV_URL || env.VITE_COLLAB_SERV_URL || 'http://localhost:2567';

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
        '~bootstrap': path.resolve(import.meta.dirname, 'node_modules/bootstrap'),
        'explorviz-frontend': path.resolve(import.meta.dirname),
      },
    },
    server: {
      port: 4200,
      proxy: {
        // The collaboration service expects its paths without the prefix.
        '/collaboration/': {
          target: collaborationTarget,
          changeOrigin: true,
          ws: true,
          rewrite: (path) => path.replace(/^\/collaboration/, ''),
        },
        '/api/analysis': {
          target: codeAnalyzerTarget,
          changeOrigin: true,
        },
        '/api': {
          target: 'http://localhost:9123',
          changeOrigin: true,
        },
        '^/v3/landscapes/[^/]+/(?:communication|timestamps|trace-data|traces)(?:/.*|\\?[^/]+|$)': {
          target: traceTarget,
          changeOrigin: true,
        },
        '^/v3/landscapes/[^/]+/spans(?:/.*|\\?[^/]+|$)': {
          target: traceTarget,
          changeOrigin: true,
        },
        '^/v3/landscapes/[^/]+/metrics(?:/.*|\\?[^/]+|$)': {
          target: metricsTarget,
          changeOrigin: true,
        },
        '^/v3/landscapes/[^/]+/logs(?:/.*|\\?[^/]+|$)': {
          target: logTarget,
          changeOrigin: true,
        },
        '^/v3/landscapes/[^/]+/log-levels(?:/.*|\\?[^/]+|$)': {
          target: logTarget,
          changeOrigin: true,
        },
        '^/v3/landscapes/[^/]+/entities/[^/]+/logs(?:/.*|\\?[^/]+|$)': {
          target: logTarget,
          changeOrigin: true,
        },
        '^/(?:user|token|snapshot|userapi)(?:/|\\?|$)': {
          target: userTarget,
          changeOrigin: true,
        },
        '/v2/code': {
          target: landscapeTarget,
          changeOrigin: true,
        },
        '/v2/landscapes': {
          target: landscapeTarget,
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
