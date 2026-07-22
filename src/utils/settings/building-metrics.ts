import { Building } from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import {
  BuildingMetricMapping,
  SELECTED_BUILDING_METRIC_OPTIONS,
  SelectedBuildingMetric,
} from 'explorviz-frontend/src/utils/settings/settings-schemas';

export type MetricBounds = {
  min: number;
  max: number;
};

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
} as const;

export const metricKeys = SELECTED_BUILDING_METRIC_OPTIONS;

export function getMetricBoundsForBuildings(
  buildings: Building[],
  metricKey: string
): MetricBounds {
  if (!metricKey || metricKey === SelectedBuildingMetric.None) {
    return { min: 0, max: 0 };
  }

  if (buildings.length === 0) {
    return { min: 0, max: 0 };
  }

  return buildings.reduce(
    (acc, building) => {
      const rawValue = building.metrics?.[metricKey]?.current ?? 0;
      const numericValue = Number(rawValue);
      const safeValue = Number.isFinite(numericValue)
        ? Math.max(0, numericValue)
        : 0;
      return {
        min: Math.min(acc.min, safeValue),
        max: Math.max(acc.max, safeValue),
      };
    },
    { min: Infinity, max: -Infinity }
  );
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

export function applyMetricMapping(
  value: number,
  mapping: BuildingMetricMapping,
  bounds?: MetricBounds
): number {
  const numericValue = Number(value);
  const safeValue = Number.isFinite(numericValue)
    ? Math.max(0, numericValue)
    : 0;

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
  buildings: Record<string, Building>
): number {
  const metricBounds = getCachedBuildingMetricBounds(buildings, heightMetric);
  const metricValue = building.metrics?.[heightMetric]?.current || 0;

  return (
    buildingFootprint +
    getMetricMappingMultiplier(heightMetric as MetricKey, metricMapping) *
      buildingHeightMultiplier *
      applyMetricMapping(metricValue, metricMapping, metricBounds)
  );
}
