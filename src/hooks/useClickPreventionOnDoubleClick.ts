// Credits: https://medium.com/trabe/prevent-click-events-on-double-click-with-react-with-and-without-hooks-6bf3697abc40
// Ceci García García

import { ThreeEvent } from '@react-three/fiber';
import { cancelablePromise } from 'explorviz-frontend/src/utils/helpers/promise-helpers';
import useCancelablePromises from './useCancelablePromises';

export const delay = (n: number) =>
  new Promise((resolve) => setTimeout(resolve, n));

const useClickPreventionOnDoubleClick = (
  onClick: (...args: any[]) => void,
  onDoubleClick: (...args: any[]) => void,
  delayInMs: number = 250,
  allowedDelta: number = 5
) => {
  const api = useCancelablePromises();

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    api.clearPendingPromises();
    const waitForClick = cancelablePromise(delay(delayInMs));
    api.appendPendingPromise(waitForClick);

    return waitForClick.promise
      .then(() => {
        api.removePendingPromise(waitForClick);
        if (e.delta < allowedDelta) {
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
