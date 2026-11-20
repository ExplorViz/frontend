import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { beginLandscapeRenderTask, useLandscapeRenderProgressStore } from '../src/stores/landscape-render-progress';

const isRendering = () => useLandscapeRenderProgressStore.getState().pendingTasks > 0;

describe('landscape render progress', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useLandscapeRenderProgressStore.setState({ pendingTasks: 0 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('stays rendering until the next paint after the last task ends', () => {
    const end = beginLandscapeRenderTask();
    expect(isRendering()).toBe(true);

    end();
    expect(isRendering()).toBe(true);

    vi.runAllTimers();
    expect(isRendering()).toBe(false);
  });

  it('bridges hand-overs between overlapping tasks', () => {
    const endFiltering = beginLandscapeRenderTask();
    endFiltering();
    const endLayouting = beginLandscapeRenderTask();

    vi.runAllTimers();
    expect(isRendering()).toBe(true);

    endLayouting();
    vi.runAllTimers();
    expect(isRendering()).toBe(false);
  });

  it('ignores repeated releases of the same task', () => {
    const endFirst = beginLandscapeRenderTask();
    const endSecond = beginLandscapeRenderTask();

    endFirst();
    endFirst();
    vi.runAllTimers();
    expect(isRendering()).toBe(true);

    endSecond();
    vi.runAllTimers();
    expect(isRendering()).toBe(false);
  });
});
