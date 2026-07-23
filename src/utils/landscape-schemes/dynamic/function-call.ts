/**
 * A FunctionCall gives detailed information about communication representing a function execution.
 */
export interface FunctionCall {
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
