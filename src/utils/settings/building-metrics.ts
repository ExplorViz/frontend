import { useCommitTreeStateStore } from 'explorviz-frontend/src/stores/commit-tree-state';
import {
  Building,
  MetricValue,
} from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import {
  BuildingMetricMapping,
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
    [SelectedBuildingMetric.commitCount]: 10,
    [SelectedBuildingMetric.commitActivity]: 10,
    [SelectedBuildingMetric.coreContributorActivity]: 10,
    [SelectedBuildingMetric.knowledgeSilo]: 10,
    [SelectedBuildingMetric.issueActivity]: 10,
    [SelectedBuildingMetric.reviewFriction]: 10,
    [SelectedBuildingMetric.knowledgeStaleness]: 10,
    [SelectedBuildingMetric.abandonedKnowledgeSilo]: 10,
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
    [SelectedBuildingMetric.commitCount]: 20,
    [SelectedBuildingMetric.commitActivity]: 20,
    [SelectedBuildingMetric.coreContributorActivity]: 20,
    [SelectedBuildingMetric.knowledgeSilo]: 10,
    [SelectedBuildingMetric.issueActivity]: 10,
    [SelectedBuildingMetric.reviewFriction]: 10,
    [SelectedBuildingMetric.knowledgeStaleness]: 10,
    [SelectedBuildingMetric.abandonedKnowledgeSilo]: 10,
  },
} as const;

function toSafeMetricValue(value: number | null | undefined): number {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? Math.max(0, numericValue) : 0;
}

export function isCommitComparisonDiffMode(): boolean {
  const repositoryName = useCommitTreeStateStore
    .getState()
    .getCurrentSelectedRepositoryName();
  const selectedCommits = useCommitTreeStateStore
    .getState()
    .getSelectedCommits();

  return (selectedCommits.get(repositoryName)?.length ?? 0) === 2;
}

export function getBuildingMetricValueForSizing(
  building: Building,
  metricKey: string,
  useCommitComparisonDiff = isCommitComparisonDiffMode()
): number {
  const metric = building.metrics?.[metricKey];
  if (!metric) {
    return 0;
  }

  const shouldUseComparisonDiff =
    useCommitComparisonDiff && building.commitComparison !== undefined;

  return getMetricValueForSizing(metric, shouldUseComparisonDiff);
}

export function getMetricValueForSizing(
  metric: MetricValue,
  useCommitComparisonDiff = isCommitComparisonDiffMode()
): number {
  const current = toSafeMetricValue(metric.current);

  if (!useCommitComparisonDiff) {
    return current;
  }

  const previous = toSafeMetricValue(metric.previous);
  return Math.abs(current - previous);
}

export function getBuildingMetricValueForHeatmap(
  building: Building,
  metricKey: string
): number | null {
  const metric = building.metrics?.[metricKey];
  if (!metric) {
    return null;
  }

  const shouldUseComparisonDiff =
    isCommitComparisonDiffMode() && building.commitComparison !== undefined;

  if (!shouldUseComparisonDiff) {
    if (metric.current === null || metric.current === undefined) {
      return null;
    }

    return toSafeMetricValue(metric.current);
  }

  return getMetricValueForSizing(metric, true);
}

export function formatBuildingMetricDisplayName(
  metric: string,
  useDiffSuffix: boolean
): string {
  if (!useDiffSuffix || metric === SelectedBuildingMetric.None) {
    return metric;
  }

  return `${metric} diff`;
}

export function getMetricBoundsForHeatmap(
  buildings: Building[],
  metricKey: string
): MetricBounds {
  if (buildings.length === 0) {
    return { min: 0, max: 0 };
  }

  const bounds = buildings.reduce(
    (acc, building) => {
      const value = getBuildingMetricValueForHeatmap(building, metricKey);
      if (value === null) {
        return acc;
      }

      return {
        min: Math.min(acc.min, value),
        max: Math.max(acc.max, value),
      };
    },
    { min: Infinity, max: -Infinity }
  );

  if (!Number.isFinite(bounds.min) || !Number.isFinite(bounds.max)) {
    return { min: 0, max: 0 };
  }

  return bounds;
}

export function applyMetricMapping(
  value: number,
  mapping: BuildingMetricMapping,
  bounds?: MetricBounds
): number {
  const safeValue = toSafeMetricValue(value);

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

  const useCommitComparisonDiff = isCommitComparisonDiffMode();

  return buildings.reduce(
    (acc, building) => {
      const safeValue = getBuildingMetricValueForSizing(
        building,
        metricKey,
        useCommitComparisonDiff
      );
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
let cachedBoundsUseCommitComparisonDiff = false;
let cachedMetricBounds: MetricBounds = { min: 0, max: 0 };

export function invalidateBuildingMetricBoundsCache(): void {
  cachedBoundsBuildingsRef = null;
  cachedBoundsMetricKey = '';
  cachedBoundsUseCommitComparisonDiff = false;
  cachedMetricBounds = { min: 0, max: 0 };
}

export function getCachedBuildingMetricBounds(
  buildings: Record<string, Building>,
  metricKey: string
): MetricBounds {
  const useCommitComparisonDiff = isCommitComparisonDiffMode();

  if (
    cachedBoundsBuildingsRef === buildings &&
    cachedBoundsMetricKey === metricKey &&
    cachedBoundsUseCommitComparisonDiff === useCommitComparisonDiff
  ) {
    return cachedMetricBounds;
  }

  cachedBoundsBuildingsRef = buildings;
  cachedBoundsMetricKey = metricKey;
  cachedBoundsUseCommitComparisonDiff = useCommitComparisonDiff;
  cachedMetricBounds = getMetricBoundsForBuildings(
    Object.values(buildings),
    metricKey
  );
  return cachedMetricBounds;
}

export function computeMappedBuildingHeight(
  building: Building,
  heightMetric: string,
  metricMapping: BuildingMetricMapping,
  buildingFootprint: number,
  buildingHeightMultiplier: number,
  bounds?: MetricBounds
): number {
  const metricValue = getBuildingMetricValueForSizing(building, heightMetric);

  return (
    buildingFootprint +
    getMetricMappingMultiplier(heightMetric as MetricKey, metricMapping) *
      buildingHeightMultiplier *
      applyMetricMapping(metricValue, metricMapping, bounds)
  );
}
