import { afterEach, vi } from 'vitest';

// Required by React's act() for both DOM and R3F roots.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
