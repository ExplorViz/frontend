// Credits: https://medium.com/trabe/prevent-click-events-on-double-click-with-react-with-and-without-hooks-6bf3697abc40
// Ceci García García

import { useRef } from "react";
import { cancelablePromise } from '../utils/helpers/promise-helpers';

const useCancelablePromises = () => {
  const pendingPromises = useRef<ReturnType<typeof cancelablePromise>[]>([]);

  const appendPendingPromise = (promise: ReturnType<typeof cancelablePromise>) =>
    pendingPromises.current = [...pendingPromises.current, promise];

  const removePendingPromise = (promise: ReturnType<typeof cancelablePromise>) =>
    pendingPromises.current = pendingPromises.current.filter(p => p !== promise);

  const clearPendingPromises = () => pendingPromises.current.map(p => p.cancel());

  const api = {
    appendPendingPromise,
    removePendingPromise,
    clearPendingPromises,
  };

  return api;
};

export default useCancelablePromises;