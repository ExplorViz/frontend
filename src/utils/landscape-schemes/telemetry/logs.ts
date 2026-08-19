import { isStringRecord } from '../../object-helpers';

/**
 * A detailed representation of an OpenTelemetry log.
 * @see {@link https://opentelemetry.io/docs/specs/otel/logs/data-model/|OTel documentation}
 * */
export interface Log {
  /**
   * Identifier for this log. Note that this is an artificial ID,
   * since OpenTelemetry logs do not have a dedicated ID field.
   */
  id: string;

  messageBody: string;

  /** Timestamp at which the log was observed, in nanoseconds since Unix epoch. */
  timeUnixNano: bigint;

  /** Telemetry key of the entity from which this log originates. */
  telemetryKey?: string;

  /** Name of the service / application from which this log originates. */
  serviceName?: string;

  /**
   * Severity number (log level) according to the OpenTelemetry log data model.
   * Range 0-24, where higher values indicate a higher severity.
   * A value of zero indicates an unspecified severity.
   * @see {@link https://opentelemetry.io/docs/specs/otel/logs/data-model/#field-severitynumber|OTel documentation}
   */
  severity: number;

  /** Original string representation of the serverity as used in the source that produced the log. */
  severityText?: string;

  /** Identifier of the trace that is associated with this log, if any. */
  traceId?: string;

  /** Identifier of the span that is associated with this log, if any. */
  spanId?: string;

  /**
   * Name of an OpenTelemetry Event represented by this log.
   * @see {@link https://opentelemetry.io/docs/specs/otel/logs/data-model/#events|OTel documentation}
   */
  eventName?: string;

  logAttributes: Record<string, string>;
  resourceAttributes: Record<string, string>;
}

export function isLog(x: any): x is Log {
  return (
    x !== null &&
    typeof x === 'object' &&
    typeof x.id === 'string' &&
    typeof x.messageBody === 'string' &&
    typeof x.timeUnixNano === 'bigint' &&
    (x.telemetryKey === undefined || typeof x.telemetryKey === 'string') &&
    (x.serviceName === undefined || typeof x.serviceName === 'string') &&
    typeof x.severity === 'number' &&
    (x.severityText === undefined || typeof x.severityText === 'string') &&
    (x.traceId === undefined || typeof x.traceId === 'string') &&
    (x.spanId === undefined || typeof x.spanId === 'string') &&
    (x.eventName === undefined || typeof x.eventName === 'string') &&
    isStringRecord(x.logAttributes) &&
    isStringRecord(x.resourceAttributes) &&
    Object.values(x.logAttributes).every((v) => typeof v === 'string') &&
    Object.values(x.resourceAttributes).every((v) => typeof v === 'string')
  );
}
