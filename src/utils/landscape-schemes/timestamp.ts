export interface Timestamp {
  epochNano: bigint;
  spanCount: number;
}

export function isTimestamp(x: any): x is Timestamp {
  return (
    x !== null &&
    typeof x === 'object' &&
    typeof x.epochNano === 'bigint' &&
    typeof x.spanCount === 'number'
  );
}
