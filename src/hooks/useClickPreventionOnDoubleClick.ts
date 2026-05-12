// Credits: https://medium.com/trabe/prevent-click-events-on-double-click-with-react-with-and-without-hooks-6bf3697abc40
// Ceci García García

import { ThreeEvent } from '@react-three/fiber';
import useCancelablePromises from 'explorviz-frontend/src/hooks/useCancelablePromises';
import { cancelablePromise } from 'explorviz-frontend/src/utils/helpers/promise-helpers';

export const delay = (n: number) =>
  new Promise((resolve) => setTimeout(resolve, n));

export type ClickPreventionOptions = {
  /**
   * Wait this long before firing a single click; a double-click within this
   * window cancels the pending click.
   */
  clickDelayMs?: number;
  /**
   * Wait this long before running the right click handler, while tracking
   * pointer drift from the right click event position.
   */
  rightClickDelayMs?: number;
  /** Maximum allowed pointer movement (pixels), same scale as R3F `delta`. */
  allowedDelta?: number;
  onRightClick?: (e: ThreeEvent<MouseEvent> | ThreeEvent<PointerEvent>) => void;
};

export const CLICK_PREVENTION_DEFAULTS = {
  clickDelayMs: 250,
  rightClickDelayMs: 150,
  allowedDelta: 5,
} as const;

/** Tracks max pointer movement (px) from `nativeEvent` until `cleanup` runs. */
export function maxPointerDriftDuringDelay(nativeEvent: MouseEvent | PointerEvent): {
  cleanup: () => void;
  getMaxDistance: () => number;
} {
  const startX = nativeEvent.clientX;
  const startY = nativeEvent.clientY;
  if (
    typeof window === 'undefined' ||
    !Number.isFinite(startX) ||
    !Number.isFinite(startY)
  ) {
    return {
      cleanup: () => {},
      getMaxDistance: () => 0,
    };
  }

  let maxMoveSq = 0;
  const recordMove = (ev: PointerEvent) => {
    const dx = ev.clientX - startX;
    const dy = ev.clientY - startY;
    maxMoveSq = Math.max(maxMoveSq, dx * dx + dy * dy);
  };

  window.addEventListener('pointermove', recordMove, {
    capture: true,
    passive: true,
  });

  return {
    cleanup: () => {
      window.removeEventListener('pointermove', recordMove, {
        capture: true,
      });
    },
    getMaxDistance: () => Math.sqrt(maxMoveSq),
  };
}

const useClickPreventionOnDoubleClick = (
  onClick: (...args: any[]) => void,
  onDoubleClick: (...args: any[]) => void,
  options?: ClickPreventionOptions
) => {
  const { clickDelayMs, rightClickDelayMs, allowedDelta, onRightClick } = {
    ...CLICK_PREVENTION_DEFAULTS,
    ...options,
  };

  const api = useCancelablePromises();

  const handleClick = (
    e: ThreeEvent<MouseEvent> | ThreeEvent<PointerEvent>
  ) => {
    e.stopPropagation();
    api.clearPendingPromises();
    const waitForClick = cancelablePromise(delay(clickDelayMs));
    api.appendPendingPromise(waitForClick);

    return waitForClick.promise
      .then(() => {
        api.removePendingPromise(waitForClick);
        // Check if mouse/pointer stayed in the allowed delta range throughout the click
        // Getting delta may throw an error in XR as there are no pointer event properties
        try {
          if (e.delta < allowedDelta) {
            onClick(e);
          }
          // Always execute click event if delta cannot be determined
        } catch {
          onClick(e);
        }
      })
      .catch((errorInfo) => {
        api.removePendingPromise(waitForClick);
        if (!errorInfo.isCanceled) {
          throw errorInfo.error;
        }
      });
  };

  const handleDoubleClick = (e: Event) => {
    e.stopPropagation();
    api.clearPendingPromises();
    onDoubleClick(e);
  };

  const handleRightClick = (
    e: ThreeEvent<MouseEvent> | ThreeEvent<PointerEvent>
  ) => {
    if (!onRightClick) {
      return;
    }
    e.stopPropagation();
    api.clearPendingPromises();

    const { cleanup: cleanupMoveListeners, getMaxDistance } =
      maxPointerDriftDuringDelay(e.nativeEvent);

    const waitForRightClick = cancelablePromise(delay(rightClickDelayMs));
    api.appendPendingPromise(waitForRightClick);

    return waitForRightClick.promise
      .then(() => {
        cleanupMoveListeners();
        api.removePendingPromise(waitForRightClick);

        if (getMaxDistance() >= allowedDelta) {
          return;
        }

        try {
          if (e.delta < allowedDelta) {
            onRightClick(e);
          }
        } catch {
          onRightClick(e);
        }
      })
      .catch((errorInfo) => {
        cleanupMoveListeners();
        api.removePendingPromise(waitForRightClick);
        if (!errorInfo.isCanceled) {
          throw errorInfo.error;
        }
      });
  };

  return [handleClick, handleDoubleClick, handleRightClick];
};

export default useClickPreventionOnDoubleClick;
