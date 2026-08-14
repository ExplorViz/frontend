import { Building } from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import {
  BuildingMetricMapping,
  SELECTED_BUILDING_METRIC_OPTIONS,
  SelectedBuildingMetric,
} from 'explorviz-frontend/src/utils/settings/settings-schemas';

export type MetricBounds = {
  min: number;
  max: number;
  sortedValues?: number[];
};
export const DEFAULT_METRIC_BUCKETS = 3;

export type MetricKey = SelectedBuildingMetric;

/** Expands mid-range normalized values so metric differences read more clearly. */
export const LOGARITHMIC_MAPPING_CONTRAST = 2.5;

/** Scales logarithmic output to produce taller/shorter building dimensions. */
export const LOGARITHMIC_MAPPING_SCALE = 2.5;

export const metricMappingMultipliers = {
  [BuildingMetricMapping.Linear]: {
    [SelectedBuildingMetric.None]: 1,
    [SelectedBuildingMetric.size]: 0.001,
    [SelectedBuildingMetric.lineCount]: 1,
    [SelectedBuildingMetric.sloc]: 1,
    [SelectedBuildingMetric.cloc]: 1,
    [SelectedBuildingMetric.importCount]: 10,
    [SelectedBuildingMetric.classCount]: 10,
    [SelectedBuildingMetric.functionCount]: 10,
    [SelectedBuildingMetric.variableCount]: 10,
  },
  [BuildingMetricMapping.Logarithmic]: {
    [SelectedBuildingMetric.None]: 1,
    [SelectedBuildingMetric.size]: 10,
    [SelectedBuildingMetric.lineCount]: 20,
    [SelectedBuildingMetric.sloc]: 20,
    [SelectedBuildingMetric.cloc]: 20,
    [SelectedBuildingMetric.importCount]: 20,
    [SelectedBuildingMetric.classCount]: 20,
    [SelectedBuildingMetric.functionCount]: 25,
    [SelectedBuildingMetric.variableCount]: 20,
  },
  [BuildingMetricMapping.BucketCount]: {
    [SelectedBuildingMetric.None]: 1,
    [SelectedBuildingMetric.size]: 10,
    [SelectedBuildingMetric.lineCount]: 10,
    [SelectedBuildingMetric.sloc]: 10,
    [SelectedBuildingMetric.cloc]: 10,
    [SelectedBuildingMetric.importCount]: 10,
    [SelectedBuildingMetric.classCount]: 10,
    [SelectedBuildingMetric.functionCount]: 10,
    [SelectedBuildingMetric.variableCount]: 10,
  },
} as const;

export const metricKeys = SELECTED_BUILDING_METRIC_OPTIONS;

export function getMetricBoundsForBuildings(
  buildings: Building[],
  metricKey: string
): MetricBounds {
  if (
    !metricKey ||
    metricKey === SelectedBuildingMetric.None ||
    buildings.length === 0
  ) {
    return { min: 0, max: 0, sortedValues: [] };
  }
  const values: number[] = [];
  let min = Infinity;
  let max = -Infinity;

  for (const building of buildings) {
    const rawValue = Number(building.metrics?.[metricKey]?.current ?? 0);
    const safeValue = Number.isFinite(rawValue) ? Math.max(0, rawValue) : 0;
    values.push(safeValue);
    if (safeValue < min) min = safeValue;
    if (safeValue > max) max = safeValue;
  }

  values.sort((a, b) => a - b);
  return { min, max, sortedValues: values };
}

let cachedBoundsBuildingsRef: Record<string, Building> | null = null;
let cachedBoundsMetricKey = '';
let cachedMetricBounds: MetricBounds = { min: 0, max: 0 };

export function getCachedBuildingMetricBounds(
  buildings: Record<string, Building>,
  metricKey: string
): MetricBounds {
  if (
    cachedBoundsBuildingsRef === buildings &&
    cachedBoundsMetricKey === metricKey
  ) {
    return cachedMetricBounds;
  }

  cachedBoundsBuildingsRef = buildings;
  cachedBoundsMetricKey = metricKey;
  cachedMetricBounds = getMetricBoundsForBuildings(
    Object.values(buildings),
    metricKey
  );
  return cachedMetricBounds;
}

let cachedEdgesSource: number[] | null = null;
let cachedEdgesBuckets = 0;
let cachedEdges: number[] = [];
export function getBucketEdges(sorted: number[], buckets: number): number[] {
  if (cachedEdgesSource === sorted && cachedEdgesBuckets === buckets) {
    return cachedEdges;
  }

  const edges: number[] = [];
  for (let i = 1; i <= buckets; i++) {
    const index = Math.min(
      sorted.length - 1,
      Math.max(0, Math.ceil((i / buckets) * sorted.length) - 1)
    );
    edges.push(sorted[index]);
  }

  cachedEdgesSource = sorted;
  cachedEdgesBuckets = buckets;
  cachedEdges = edges;
  return edges;
}

export function applyMetricMapping(
  value: number,
  mapping: BuildingMetricMapping,
  bounds?: MetricBounds,
  buckets: number = DEFAULT_METRIC_BUCKETS
): number {
  const numericValue = Number(value);
  const safeValue = Number.isFinite(numericValue)
    ? Math.max(0, numericValue)
    : 0;

  if (mapping === BuildingMetricMapping.BucketCount) {
    const sorted = bounds?.sortedValues;
    if (!sorted || sorted.length === 0) {
      return 0;
    }
    const edges = getBucketEdges(sorted, Math.max(2, Math.round(buckets)));
    let bucket = 0;
    while (bucket < edges.length - 1 && safeValue > edges[bucket]) {
      bucket++;
    }
    return bucket + 1;
  }

  if (mapping === BuildingMetricMapping.Logarithmic) {
    const min = bounds?.min ?? 0;
    const max = bounds?.max ?? safeValue;
    const clampedValue = Math.min(max, Math.max(min, safeValue));
    const logMin = Math.log1p(Math.max(0, min));
    const logMax = Math.log1p(Math.max(0, max));
    const logValue = Math.log1p(clampedValue);
    const logRange = logMax - logMin;
    if (logRange <= 0) {
      return 0;
    }
    const normalized = (logValue - logMin) / logRange;
    const contrasted = Math.min(
      1,
      Math.max(0, 0.5 + (normalized - 0.5) * LOGARITHMIC_MAPPING_CONTRAST)
    );
    return contrasted * logMax * LOGARITHMIC_MAPPING_SCALE;
  }

  return safeValue;
}

export function getMetricMappingMultiplier(
  metric: MetricKey,
  mapping: BuildingMetricMapping
): number {
  return metricMappingMultipliers[mapping][metric];
}

export function computeMappedBuildingHeight(
  building: Building,
  heightMetric: string,
  metricMapping: BuildingMetricMapping,
  buildingFootprint: number,
  buildingHeightMultiplier: number,
  buildings: Record<string, Building>,
  metricBuckets: number = DEFAULT_METRIC_BUCKETS
): number {
  const metricBounds = getCachedBuildingMetricBounds(buildings, heightMetric);
  const metricValue = building.metrics?.[heightMetric]?.current || 0;

  return (
    buildingFootprint +
    getMetricMappingMultiplier(heightMetric as MetricKey, metricMapping) *
      buildingHeightMultiplier *
      applyMetricMapping(metricValue, metricMapping, metricBounds, metricBuckets)
  );
}
