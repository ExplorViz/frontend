import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';
import { MetricValue } from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';

export const NULL_METRIC_DISPLAY = '—';

export function coerceMetricNumber(
  value: number | null | undefined
): number | null {
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

export function formatWithUpToTwoDecimals(
  value: number | null | undefined
): string {
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

export function getMetricNumericValue(
  value: MetricValue | number | string | null | undefined
): number | null {
  if (value == null) {
    return null;
  }

  if (typeof value === 'number' || typeof value === 'string') {
    return coerceMetricNumber(value);
  }

  return coerceMetricNumber(value.current);
}

export function getMetricPreviousNumericValue(
  value: MetricValue | number | string | null | undefined
): number | null {
  if (value == null || typeof value !== 'object') {
    return null;
  }

  return coerceMetricNumber(value.previous);
}

export function formatMetricValue(
  name: string,
  value: number | null | undefined
): string {
  if (name.trim().toLowerCase() === 'size') {
    const numericValue = coerceMetricNumber(value);
    if (numericValue === null) {
      return NULL_METRIC_DISPLAY;
    }

    return formatSizeMetric(numericValue);
  }

  return formatInteger(value);
}

export function accumulateBuildingMetrics(
  buildingIds: string[]
): Record<string, MetricValue> {
  const aggregated = new Map<
    string,
    { current: number; previous: number; hasPrevious: boolean }
  >();

  buildingIds.forEach((buildingId) => {
    const building = useModelStore.getState().getBuilding(buildingId);
    if (!building?.metrics) {
      return;
    }

    Object.entries(building.metrics).forEach(([name, value]) => {
      const entry = aggregated.get(name) ?? {
        current: 0,
        previous: 0,
        hasPrevious: false,
      };

      entry.current += getMetricNumericValue(value) ?? 0;

      const previousValue = getMetricPreviousNumericValue(value);
      if (previousValue != null) {
        entry.hasPrevious = true;
        entry.previous += previousValue;
      }

      aggregated.set(name, entry);
    });
  });

  return Object.fromEntries(
    [...aggregated.entries()].map(
      ([name, { current, previous, hasPrevious }]) => [
        name,
        {
          current,
          previous: hasPrevious ? previous : undefined,
        },
      ]
    )
  );
}
