/**
 * Represents a time range within which communication between entities occurs.
 *
 * Timestamps are inferred by bucketing spans at a fixed interval size.
 * Note that timestamp bounds do not necessarily align with traces.
 */
export interface Timestamp {
  /**
   * The point in time at which this timestamp begins,
   * given in nanoseconds since the Unix epoch (inclusive).
   */
  fromUnixNano: bigint;

  /**
   * The point in time at which this timestamp ends,
   * given in nanoseconds since the Unix epoch (exclusive).
   */
  toUnixNano: bigint;

  /**
   * Contains the trace IDs of those traces that have any span
   * starting within the time range represented by this timestamp.
   */
  traceIds: string[];

  /**
   * The number of spans which start within the time range represented by this timestamp.
   */
  spanCount: number;
}

export function isTimestamp(x: any): x is Timestamp {
  const traceIds = x.traceIds;
  return (
    x !== null &&
    typeof x === 'object' &&
    typeof x.fromUnixNano === 'bigint' &&
    typeof x.toUnixNano === 'bigint' &&
    Array.isArray(traceIds) &&
    traceIds.every((id) => typeof id === 'string') &&
    typeof x.spanCount === 'number'
  );
}
