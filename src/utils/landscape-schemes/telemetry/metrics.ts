/** A MetricsPointKind specifies the format in which metric datapoints are given.
 * @see {@link https://opentelemetry.io/docs/specs/otel/metrics/data-model/#point-kinds|OTel documentation}
 */
export type MetricsPointKind = 'sum' | 'gauge' | 'histogram' | 'exp_histogram';

/**
 * A MetricOverview contains surface-level information about an available runtime
 * metric that can be presented to the user when selecting a metric to visualize.
 */
export interface MetricOverview {
  name: string;
  description: string;
  unit: string;

  /** The kind of datapoint this metric consists of as per the OTel metrics data model.
   * @see {@link https://opentelemetry.io/docs/specs/otel/metrics/data-model/#point-kinds|OTel documentation}
   */
  pointKind: MetricsPointKind;

  /** List of services which have time series for this metric. */
  services: string[];

  /** List of telemetry keys for visualization entities that have time series for this metrics. */
  entities: string[];
}

export type MetricValues = GaugeMetricValues;

export interface GaugeMetricPoint {
  value: number;
  timeUnixMilli: number;
}

export interface GaugeMetricValues {
  pointKind: 'gauge';
  points: GaugeMetricPoint[];
  startUnixMilli: number;
  endUnixMilli: number;
}

export function isMetricOverview(x: any): x is MetricOverview {
  const services = x.services;
  const entities = x.entities;
  return (
    x !== null &&
    typeof x === 'object' &&
    typeof x.name === 'string' &&
    typeof x.description === 'string' &&
    Array.isArray(services) &&
    services.every((v) => typeof v === 'string') &&
    Array.isArray(entities) &&
    entities.every((v) => typeof v === 'string')
  );
}

export function isMetricValues(x: any): x is MetricValues {
  return isGaugeMetricValues(x);
}

export function isGaugeMetricPoint(x: any): x is GaugeMetricPoint {
  return (
    x !== null &&
    typeof x.value === 'number' &&
    typeof x.timeUnixMilli === 'number'
  );
}

export function isGaugeMetricValues(x: any): x is GaugeMetricValues {
  const points = x.points;
  return (
    x !== null &&
    x.pointKind === 'gauge' &&
    Array.isArray(points) &&
    points.every((v) => isGaugeMetricPoint(v))
  );
}
