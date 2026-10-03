/** A MetricsPointKind specifies the format in which metric datapoints are given.
 * @see {@link https://opentelemetry.io/docs/specs/otel/metrics/data-model/#point-kinds|OTel documentation}
 */
export type MetricsPointKind = 'sum' | 'gauge' | 'histogram' | 'exp_histogram';

/**
 * Contains surface-level information about an available runtime metric
 * that can be presented to the user when selecting a metric to visualize.
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

/** Represents a set of values from an OpenTelemetry metric that can be visualized in a chart. */
export type MetricValues =
  SumMetricValues | GaugeMetricValues | HistogramMetricValues;

/**
 * Represents an individual datapoint in a sum time series.
 * Depending on the requested data, this does not necessarily correspond to a single
 * measurement, but may be an aggregated value, either temporally or spatially.
 */
export interface SumMetricPoint {
  /** The measured value, or the result value from aggregation of multiple measurements. */
  value: number;

  /**
   * Timestamp of the measurement (or time bin for temporally aggregated values),
   * given in elapsed milliseconds since the Unix epoch.
   */
  timeUnixMilli: number;
}

/**
 * Represents an excerpt of a time series for an OpenTelemetry sum metric.
 * @see {@link https://opentelemetry.io/docs/specs/otel/metrics/data-model/#sums}
 */
export interface SumMetricValues {
  pointKind: 'sum';

  /** The individual measurements or aggregated datapoints in the time series. */
  points: SumMetricPoint[];

  /**
   * Unix epoch timestamp in milliseconds indicating the beginning of this time series excerpt.
   * Equal to the smallest {@link SumMetricPoint.timeUnixMilli} value in the time series excerpt.
   */
  startUnixMilli: number;

  /**
   * Unix epoch timestamp in milliseconds indicating the end of this time series excerpt.
   * Equal to the largest {@link SumMetricPoint.timeUnixMilli} value in the time series excerpt.
   */
  endUnixMilli: number;
}

/**
 * Represents an individual datapoint in a gauge time series.
 * Depending on the requested data, this does not necessarily correspond to a single
 * measurement, but may be an aggregated value, either temporally or spatially.
 */
export interface GaugeMetricPoint {
  /** The measured value, or the result value from aggregation of multiple measurements. */
  value: number;

  /**
   * Timestamp of the measurement (or time bin for temporally aggregated values),
   * given in elapsed milliseconds since the Unix epoch.
   */
  timeUnixMilli: number;
}

/**
 * Represents an excerpt of a time series for an OpenTelemetry gauge metric.
 * @see {@link https://opentelemetry.io/docs/specs/otel/metrics/data-model/#gauge}
 */
export interface GaugeMetricValues {
  pointKind: 'gauge';

  /** The individual measurements or aggregated datapoints of the time series. */
  points: GaugeMetricPoint[];

  /**
   * Unix epoch timestamp in milliseconds indicating the beginning of this time series excerpt.
   * Equal to the smallest {@link GaugeMetricPoint.timeUnixMilli} value in the time series excerpt.
   */
  startUnixMilli: number;

  /**
   * Unix epoch timestamp in milliseconds indicating the end of this time series excerpt.
   * Equal to the largest {@link GaugeMetricPoint.timeUnixMilli} value in the time series excerpt.
   */
  endUnixMilli: number;
}

/**
 * Represents a single bucket within a histogram measurement.
 * Such a bucket is defined by its upper bound and the number of measurements that fall
 * within it. Note that the lower bound of the bucket is inferred from the previous bucket.
 * If no previous bucket exists, the lower bound is assumed to be negative infinity.
 */
export interface HistogramMetricPoint {
  /**
   * The upper boundary (inclusive) of the bucket represented by this datapoint.
   * An undefined value indicates that this is the last bucket in the histogram,
   * meaning the datapoint counts all values which exceed every defined bucket.
   */
  bound?: number;

  /**
   * Indicates the number of measurements which fall in the bucket defined
   * by this datapoint. Specifically, it counts every measurement where the value
   * is strictly greater than the upper bound of the previous bucket, but less than
   * or equal to the upper bound of this bucket.
   */
  count: number;
}

/**
 * Represents a concrete state of an OpenTelemetry histogram metric.
 * @see {@link https://opentelemetry.io/docs/specs/otel/metrics/data-model/#histogram}
 */
export interface HistogramMetricValues {
  pointKind: 'histogram';

  /** The buckets of the histogram, defined by a boundary and a count. */
  points: HistogramMetricPoint[];

  /** The sum of all raw measurements which were used to construct the histogram. */
  sum: number;

  /** The number of raw measurements from which the histogram was constructed. */
  count: number;
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
  return (
    isSumMetricValues(x) || isGaugeMetricValues(x) || isHistogramMetricValues(x)
  );
}

export function isSumMetricPoint(x: any): x is SumMetricPoint {
  return (
    x !== null &&
    typeof x.value === 'number' &&
    typeof x.timeUnixMilli === 'number'
  );
}

export function isSumMetricValues(x: any): x is SumMetricValues {
  const points = x.points;
  return (
    x !== null &&
    x.pointKind === 'sum' &&
    Array.isArray(points) &&
    points.every((v) => isSumMetricPoint(v)) &&
    typeof x.startUnixMilli === 'number' &&
    typeof x.endUnixMilli === 'number'
  );
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
    points.every((v) => isGaugeMetricPoint(v)) &&
    typeof x.startUnixMilli === 'number' &&
    typeof x.endUnixMilli === 'number'
  );
}

export function isHistogramMetricPoint(x: any): x is HistogramMetricPoint {
  return (
    x !== null &&
    ['number', 'undefined'].includes(typeof x.bound) &&
    typeof x.count === 'number'
  );
}

export function isHistogramMetricValues(x: any): x is HistogramMetricValues {
  const points = x.points;
  return (
    x !== null &&
    x.pointKind === 'histogram' &&
    Array.isArray(points) &&
    points.every((v) => isHistogramMetricPoint(v)) &&
    points.every((v, i) =>
      i === points.length - 1 ? v.bound === undefined : v.bound !== undefined
    )
  );
}
