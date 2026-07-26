/**
 * A MetricRange records the minimum and maximum encountered values for a particular metric.
 */
export interface MetricRange {
  min: number;
  max: number;
}

/**
 * A Comm represents a communication relationship between two particular entities.
 */
export interface Comm {
  id: string;

  /** Telemetry lookup key of the source entity */
  sourceEntityKey: string;

  /** Telemetry lookup key of the target entity */
  targetEntityKey: string;

  isBidirectional: boolean;

  /** Earliest nanosecond Unix epoch timestamp where communication between the entities occurs */
  fromUnixNano: bigint;

  /** Latest nanosecond Unix epoch timestamp where communication between the entities occurs */
  toUnixNano: bigint;

  metrics: Record<string, number>;
}

/**
 * A CommSummary contains all communication for a particular visualization state.
 */
export interface CommSummary {
  communications: Comm[];

  fromUnixNano: bigint;
  toUnixNano: bigint;

  /**
   * Minimum and maximum value of metrics across all communications within this summary
   */
  metrics: Record<string, MetricRange>;
}

export function isMetricRange(x: any): x is MetricRange {
  return isObject(x) && typeof x.min === 'number' && typeof x.max === 'number';
}

export function isComm(x: any): x is Comm {
  return (
    isObject(x) &&
    typeof x.id === 'string' &&
    typeof x.sourceEntityKey === 'string' &&
    typeof x.targetEntityKey === 'string' &&
    typeof x.isBidirectional === 'boolean' &&
    typeof x.fromUnixNano === 'bigint' &&
    typeof x.toUnixNano === 'bigint' &&
    isObject(x.metrics) &&
    Object.values(x.metrics).every((v) => typeof v === 'number')
  );
}

export function isCommSummary(x: any): x is CommSummary {
  return (
    isObject(x) &&
    Array.isArray(x.communications) &&
    x.communications.every(isComm) &&
    typeof x.fromUnixNano === 'bigint' &&
    typeof x.toUnixNano === 'bigint' &&
    isObject(x.metrics) &&
    Object.values(x.metrics).every(isMetricRange)
  );
}

function isObject(x: any): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}
