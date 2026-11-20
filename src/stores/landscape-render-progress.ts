import { create } from 'zustand';

/**
 * Tracks whether a new landscape is on its way to the screen: entity filtering,
 * layouting and drawing the new city. Each step holds a task while it works, and
 * the landscape counts as rendering while any task is held.
 *
 * Tasks overlap on purpose: a step that hands the landscape on to the next step
 * releases its task only after the next paint, by which time the next step has
 * taken its own task. This keeps the indicator from flickering between steps.
 */
interface LandscapeRenderProgressState {
  pendingTasks: number;
}

export const useLandscapeRenderProgressStore = create<LandscapeRenderProgressState>(() => ({
  pendingTasks: 0,
}));

export const useIsLandscapeRendering = () => useLandscapeRenderProgressStore((state) => state.pendingTasks > 0);

/**
 * Marks the landscape as rendering until the returned function is called. The
 * returned function releases the task after the next paint, and calling it more
 * than once has no further effect.
 */
export function beginLandscapeRenderTask(): () => void {
  useLandscapeRenderProgressStore.setState((state) => ({ pendingTasks: state.pendingTasks + 1 }));

  let released = false;
  return () => {
    if (released) {
      return;
    }
    released = true;
    afterNextPaint(() =>
      useLandscapeRenderProgressStore.setState((state) => ({ pendingTasks: Math.max(0, state.pendingTasks - 1) }))
    );
  };
}

/**
 * Resolves after the browser has painted the current frame. Await it before
 * long synchronous work so that a just-shown indicator is on screen first; its
 * CSS animation then keeps running on the compositor while the main thread is busy.
 */
export function waitForNextPaint(): Promise<void> {
  return new Promise((resolve) => afterNextPaint(resolve));
}

function afterNextPaint(callback: () => void) {
  if (typeof requestAnimationFrame === 'undefined') {
    setTimeout(callback, 0);
    return;
  }
  // rAF callbacks run right before a paint; the timeout fires after it.
  requestAnimationFrame(() => setTimeout(callback, 0));
}
