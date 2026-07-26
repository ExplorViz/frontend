/**
 * A CommFunction gives detailed information about communication representing an executed function.
 */
export interface CommFunction {
  id: string;
  name: string;

  /**
   * The function call is considered forward if the source entity calls a function from the target entity.
   * This distinction is only meaningful for bidirectional communication, as otherwise all function calls
   * should be forward.
   */
  isForward: boolean;

  /**
   * Number of times this function was called in the given time range
   */
  callCount: number;

  /**
   * Sum of durations for all calls of this function
   */
  executionTime: number;
}

export function isCommFunction(x: any): x is CommFunction {
  return (
    typeof x === 'object' &&
    x !== null &&
    typeof x.id === 'string' &&
    typeof x.name === 'string' &&
    typeof x.isForward === 'boolean' &&
    typeof x.callCount === 'number' &&
    typeof x.executionTime === 'number'
  );
}
