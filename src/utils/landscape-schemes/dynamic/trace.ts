import { isStringRecord } from 'explorviz-frontend/src/utils/object-helpers';

export type Trace = {
  traceId: string;

  /** Start time of the trace in nanoseconds since Unix epoch */
  startUnixNano: bigint;

  /** End time of the trace in nanoseconds since Unix epoch */
  endUnixNano: bigint;

  spans: Span[];
};

export type Span = {
  spanId: string;
  traceId: string;
  parentSpanId?: string;
  childSpanIds: string[];

  name: string;
  kind: string;

  /** Lookup key for the entity represented by this span */
  entityKey: string;

  /** Start time of the span in nanoseconds since Unix epoch */
  startUnixNano: bigint;

  /** End time of the span in nanoseconds since Unix epoch */
  endUnixNano: bigint;

  spanAttributes: Record<string, string>;
  resourceAttributes: Record<string, string>;
};

export function isTrace(x: any): x is Trace {
  return (
    x !== null &&
    typeof x === 'object' &&
    typeof x.traceId === 'string' &&
    typeof x.startUnixNano === 'bigint' &&
    typeof x.endUnixNano === 'bigint' &&
    Array.isArray(x.spans) &&
    x.spans.every(isSpan)
  );
}

export function isSpan(x: any): x is Span {
  return (
    x !== null &&
    typeof x === 'object' &&
    typeof x.spanId === 'string' &&
    typeof x.traceId === 'string' &&
    (x.parentSpanId === undefined || typeof x.parentSpanId === 'string') &&
    Array.isArray(x.childSpanIds) &&
    x.childSpanIds.every((v: unknown) => typeof v === 'string') &&
    typeof x.name === 'string' &&
    typeof x.kind === 'string' &&
    typeof x.entityKey === 'string' &&
    typeof x.startUnixNano === 'bigint' &&
    typeof x.endUnixNano === 'bigint' &&
    isStringRecord(x.spanAttributes) &&
    isStringRecord(x.resourceAttributes) &&
    Object.values(x.spanAttributes).every((v) => typeof v === 'string') &&
    Object.values(x.resourceAttributes).every((v) => typeof v === 'string')
  );
}

export type DynamicLandscapeData = Trace[];
