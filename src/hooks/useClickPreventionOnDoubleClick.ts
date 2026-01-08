// Credits: https://medium.com/trabe/prevent-click-events-on-double-click-with-react-with-and-without-hooks-6bf3697abc40
// Ceci García García

import { ThreeEvent } from '@react-three/fiber';
import useCancelablePromises from 'explorviz-frontend/src/hooks/useCancelablePromises';
import { cancelablePromise } from 'explorviz-frontend/src/utils/helpers/promise-helpers';

export const delay = (n: number) =>
  new Promise((resolve) => setTimeout(resolve, n));

const useClickPreventionOnDoubleClick = (
  onClick: (...args: any[]) => void,
  onDoubleClick: (...args: any[]) => void,
  delayInMs: number = 250,
  allowedDelta: number = 5
) => {
  const api = useCancelablePromises();

  const handleClick = (
    e: ThreeEvent<MouseEvent> | ThreeEvent<PointerEvent>
  ) => {
    e.stopPropagation();
    api.clearPendingPromises();
    const waitForClick = cancelablePromise(delay(delayInMs));
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

  return [handleClick, handleDoubleClick];
};

export default useClickPreventionOnDoubleClick;
