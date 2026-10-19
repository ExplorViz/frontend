import { isStringRecord } from 'explorviz-frontend/src/utils/object-helpers';

/**
 * A detailed representation of an OpenTelemetry trace.
 */
export interface Trace {
  traceId: string;

  /** Start time of the trace in nanoseconds since Unix epoch */
  startUnixNano: bigint;

  /** End time of the trace in nanoseconds since Unix epoch */
  endUnixNano: bigint;

  spans: Span[];
}

/**
 * A detailed representation of an OpenTelemetry span.
 */
export interface Span {
  spanId: string;
  traceId: string;
  parentSpanId?: string;

  name: string;

  /**
   * Role of a span in a request according to the OpenTelemetry trace data model.
   * @see {@link https://opentelemetry.io/docs/specs/otel/trace/api/#spankind|OTel documentation}
   */
  kind: string;

  /** Lookup key for telemetry of the entity from which this log originates. */
  telemetryKey?: string;

  /** Name of the service / application from which this log originates. */
  serviceName: string;

  /**
   * Name of the OpenTelemetry instrumentation scope that the span belongs to.
   * @see {@link https://opentelemetry.io/docs/concepts/instrumentation-scope/|OTel documentation} */
  instrumentationScope: string;

  /** Start time of the span in nanoseconds since Unix epoch */
  startUnixNano: bigint;

  /** End time of the span in nanoseconds since Unix epoch */
  endUnixNano: bigint;

  spanAttributes: Record<string, string>;
  resourceAttributes: Record<string, string>;
}

/** Contains the span IDs of two spans that are in a parent-child relationship. */
export interface SpanPair {
  parentSpanId: string;
  childSpanId: string;
}

/** Provides detailed information on the spans from which a particular communication was derived. */
export interface CommSpans {
  /** Maps the ID of a span to the detailed span information */
  spans: Record<string, Span>;

  /** Contains each parent-child span pair from which the communication was derived */
  pairs: SpanPair[];
}

/** An information summary for an OpenTelemetry trace. */
export interface TraceOverview {
  traceId: string;

  /** Name of the root span of the trace. */
  name: string;

  /**
   * Minimum of the start times of all spans in the trace,
   * given in nanoseconds since the Unix epoch.
   */
  startUnixNano: bigint;

  /**
   * Maximum of the end times of all spans in the trace,
   * given in nanoseconds since the Unix epoch.
   */
  endUnixNano: bigint;

  /** Number of spans in the trace. */
  spanCount: number;

  /** The names of all services involved in the trace. */
  services: string[];

  /** Name of the service that created the root span. */
  entrypointService: string;
}

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
    typeof x.name === 'string' &&
    typeof x.kind === 'string' &&
    typeof x.startUnixNano === 'bigint' &&
    typeof x.endUnixNano === 'bigint' &&
    isStringRecord(x.spanAttributes) &&
    isStringRecord(x.resourceAttributes) &&
    Object.values(x.spanAttributes).every((v) => typeof v === 'string') &&
    Object.values(x.resourceAttributes).every((v) => typeof v === 'string')
  );
}

export function isSpanPair(x: any): x is SpanPair {
  return (
    x !== null &&
    typeof x === 'object' &&
    typeof x.parentSpanId === 'string' &&
    typeof x.childSpanId === 'string'
  );
}

export function isCommSpans(x: any): x is CommSpans {
  return (
    x !== null &&
    typeof x === 'object' &&
    isStringRecord(x.spans) &&
    Object.values(x.spans).every(isSpan) &&
    Array.isArray(x.pairs) &&
    x.pairs.every(isSpanPair)
  );
}

export function isTraceOverview(x: any): x is TraceOverview {
  const services = x.services;
  return (
    typeof x.name === 'string' &&
    typeof x.spanCount === 'number' &&
    typeof x.startUnixNano === 'bigint' &&
    typeof x.endUnixNano === 'bigint' &&
    Array.isArray(services) &&
    services.every((v) => typeof v === 'string') &&
    typeof x.entrypointService === 'string'
  );
}

export type DynamicLandscapeData = Trace[];
