import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';
import { MetricValue } from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import { SOCIAL_METRICS } from 'explorviz-frontend/src/utils/landscape-schemes/social-metrics-helpers';
import { FRACTIONAL_CODE_METRICS } from 'explorviz-frontend/src/utils/settings/settings-schemas';

export const NULL_METRIC_DISPLAY = '—';

export function coerceMetricNumber(value: number | null | undefined): number | null {
  if (value == null) {
    return null;
  }

  const numericValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

export function formatInteger(value: number | null | undefined): string {
  const numericValue = coerceMetricNumber(value);
  if (numericValue === null) {
    return NULL_METRIC_DISPLAY;
  }

  return Math.round(numericValue).toLocaleString('en-US');
}

export function formatWithUpToTwoDecimals(value: number | null | undefined): string {
  const numericValue = coerceMetricNumber(value);
  if (numericValue === null) {
    return NULL_METRIC_DISPLAY;
  }

  return numericValue.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export function formatSizeMetric(valueInBytes: number): string {
  const kiloBytes = 1024;
  const megaBytes = kiloBytes * 1024;

  if (Math.abs(valueInBytes) >= megaBytes) {
    return `${formatWithUpToTwoDecimals(valueInBytes / megaBytes)} MegaBytes`;
  }

  if (Math.abs(valueInBytes) >= kiloBytes) {
    return `${formatWithUpToTwoDecimals(valueInBytes / kiloBytes)} KiloBytes`;
  }

  return `${formatWithUpToTwoDecimals(valueInBytes)} Bytes`;
}

export function getMetricNumericValue(value: MetricValue | number | string | null | undefined): number | null {
  if (value == null) {
    return null;
  }

  if (typeof value === 'number' || typeof value === 'string') {
    return coerceMetricNumber(value);
  }

  return coerceMetricNumber(value.current);
}

export function getMetricPreviousNumericValue(value: MetricValue | number | string | null | undefined): number | null {
  if (value == null || typeof value !== 'object') {
    return null;
  }

  return coerceMetricNumber(value.previous);
}

function hasFractionalValues(name: string): boolean {
  return SOCIAL_METRICS.has(name) || FRACTIONAL_CODE_METRICS.has(name);
}

export function formatMetricValue(name: string, value: number | null | undefined): string {
  if (name.trim().toLowerCase() === 'size') {
    const numericValue = coerceMetricNumber(value);
    if (numericValue === null) {
      return NULL_METRIC_DISPLAY;
    }

    return formatSizeMetric(numericValue);
  }

  if (hasFractionalValues(name)) {
    return formatWithUpToTwoDecimals(value);
  }

  return formatInteger(value);
}

/** Averages of large numbers are shown without decimals. */
export function formatMetricAverage(name: string, average: number): string {
  if (name === 'size') {
    return formatSizeMetric(average);
  }
  return hasFractionalValues(name) || Math.abs(average) < 10
    ? formatWithUpToTwoDecimals(average)
    : formatInteger(average);
}

export function formatMetricDifference(name: string, difference: number): string {
  const text = hasFractionalValues(name) ? formatWithUpToTwoDecimals(difference) : formatInteger(difference);
  return difference > 0 ? `+${text}` : text;
}

/** Sum of a metric over several buildings. */
export type AggregatedMetric = {
  sum: number;
  /** Average of the buildings that have the metric. */
  average: number;
};

export type AggregatedMetricValue = {
  /** Missing if no building has the metric. */
  current?: AggregatedMetric;
  previous?: AggregatedMetric;
};

/** E.g. "2,092 (82 avg)" */
export function formatAggregatedMetric(name: string, metric: AggregatedMetric | undefined): string {
  if (!metric) {
    return NULL_METRIC_DISPLAY;
  }
  return `${formatMetricValue(name, metric.sum)} (${formatMetricAverage(name, metric.average)} avg)`;
}

function aggregate(values: Array<number | null>): AggregatedMetric | undefined {
  const present = values.filter((value) => value !== null);
  if (present.length === 0) {
    return undefined;
  }
  const sum = present.reduce((total, value) => total + value, 0);
  return { sum, average: sum / present.length };
}

export function accumulateBuildingMetrics(buildingIds: string[]): Record<string, AggregatedMetricValue> {
  const valuesByName = new Map<string, MetricValue[]>();

  buildingIds.forEach((buildingId) => {
    const metrics = useModelStore.getState().getBuilding(buildingId)?.metrics ?? {};
    Object.entries(metrics).forEach(([name, value]) => {
      const values = valuesByName.get(name);
      if (values) {
        values.push(value);
      } else {
        valuesByName.set(name, [value]);
      }
    });
  });

  return Object.fromEntries(
    [...valuesByName].map(([name, values]) => [
      name,
      {
        current: aggregate(values.map(getMetricNumericValue)),
        previous: aggregate(values.map(getMetricPreviousNumericValue)),
      },
    ])
  );
}
