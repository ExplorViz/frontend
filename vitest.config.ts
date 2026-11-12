import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      'explorviz-frontend': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.{ts,tsx}'],
    setupFiles: ['tests/setup.ts'],
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'cobertura'],
      // Explicit regression baseline; expand this list as features gain tests.
      include: [
        'src/utils/response-error.ts',
        'src/utils/search-expression-matcher.ts',
        'src/utils/layout/box-layout.ts',
        'src/utils/city-rendering/building-comparison-visibility.ts',
        'src/utils/city-rendering/building-filter.ts',
        'src/utils/city-rendering/flat-landscape-filter.ts',
        'src/hooks/useClickPreventionOnDoubleClick.ts',
        'src/hooks/useCancelablePromises.ts',
        'src/hooks/useLongPress.ts',
        'src/stores/repos/model-repository.ts',
        'src/stores/cluster-store.ts',
        'src/stores/communication-store.ts',
        'src/components/attributes-table.tsx',
        'src/components/dual-range-slider.tsx',
        'src/view-objects/3d/city/city-foundation.tsx',
        'src/utils/collaboration/room-connection.ts',
        'src/utils/collaboration/chat.ts',
        'src/components/visualization/page-setup/sidebar/customizationbar/chat/chat-box.tsx',
        'src/components/collaboration/visualization/page-setup/sidebar/customizationbar/collaboration/collaboration-controls.tsx',
        'src/components/visualization/rendering/spectate-camera-controller.tsx',
      ],
      thresholds: { lines: 80, statements: 80, functions: 80, branches: 70 },
    },
  },
});
