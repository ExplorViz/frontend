import { coerceMetricNumber } from 'explorviz-frontend/src/components/visualization/rendering/popups/city-popups/building-metrics-utils';
import { type EntityFilterMode, type MetricRange } from 'explorviz-frontend/src/stores/entity-filtering-store';
import { ModelType, type Building, type Language } from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import { normalizeLanguage } from 'explorviz-frontend/src/utils/language-utils';
import {
  compileSearchExpressions,
  matchesAnyCompiledExpression,
} from 'explorviz-frontend/src/utils/search-expression-matcher';
import { isActiveMetricRange } from 'explorviz-frontend/src/utils/settings/metric-settings';
import { BUILDING_METRIC_NAMES } from 'explorviz-frontend/src/utils/settings/settings-schemas';

export type BuildingFilterCriteria = {
  filterMode: EntityFilterMode;
  hiddenModelTypes: ReadonlySet<ModelType>;
  hiddenLanguages: ReadonlySet<Language>;
  inclusionExpressions: readonly string[];
  exclusionExpressions: readonly string[];
  metricRanges: Record<string, MetricRange>;
};

export type CompiledBuildingFilter = {
  /**
   * False when no criterion can exclude anything, letting callers skip the scan
   * over all buildings entirely.
   */
  readonly isActive: boolean;
  readonly isFiltered: (building: Building) => boolean;
};

/** Returns null if the metric could not be computed. Removed buildings only have their previous value. */
function getMetricValue(building: Building, metricKey: string): number | null {
  const metric = building.metrics?.[metricKey];
  const value = building.commitComparison === 'REMOVED' ? (metric?.current ?? metric?.previous) : metric?.current;
  return coerceMetricNumber(value);
}

/** Bounds of the metric ranges to choose from. */
export function getMetricFilterBounds(buildings: Record<string, Building>): Record<string, MetricRange> {
  const buildingList = Object.values(buildings);
  return Object.fromEntries(
    BUILDING_METRIC_NAMES.map((metricName) => [
      metricName,
      {
        min: 0,
        max: buildingList.reduce((max, building) => Math.max(max, getMetricValue(building, metricName) ?? 0), 0),
      },
    ])
  );
}

const NOTHING_FILTERED: CompiledBuildingFilter = {
  isActive: false,
  isFiltered: () => false,
};

/**
 * Resolves the filter criteria into a predicate once, instead of re-deriving
 * per-building work (regex compilation, threshold lookups) for every candidate.
 */
export function compileBuildingFilter(criteria: BuildingFilterCriteria): CompiledBuildingFilter {
  const filtersByModelType = criteria.filterMode === 'Remove' && criteria.hiddenModelTypes.size > 0;

  // In "Hide" mode a hidden language is applied by the visibility checks rather
  // than by removing the building from the landscape.
  const filtersByLanguage = criteria.filterMode === 'Remove' && criteria.hiddenLanguages.size > 0;

  // Ranges default to [0, Infinity], so only a positive lower bound or a finite
  // upper bound excludes anything, including buildings without the metric.
  const activeMetricRanges = BUILDING_METRIC_NAMES.flatMap((metricName) => {
    const range = criteria.metricRanges[metricName];
    return isActiveMetricRange(range) ? [[metricName, range] as const] : [];
  });

  const inclusionExpressions = compileSearchExpressions(criteria.inclusionExpressions);
  const exclusionExpressions = compileSearchExpressions(criteria.exclusionExpressions);

  const matchesFqn = inclusionExpressions.length > 0 || exclusionExpressions.length > 0;

  if (!filtersByModelType && !filtersByLanguage && activeMetricRanges.length === 0 && !matchesFqn) {
    return NOTHING_FILTERED;
  }

  const isFiltered = (building: Building): boolean => {
    if (
      (filtersByModelType && criteria.hiddenModelTypes.has(building.type)) ||
      (filtersByLanguage && criteria.hiddenLanguages.has(normalizeLanguage(building.language)))
    ) {
      return true;
    }

    for (const [metricName, range] of activeMetricRanges) {
      const value = getMetricValue(building, metricName);
      if (value === null || value < range.min || value > range.max) {
        return true;
      }
    }

    if (!matchesFqn) {
      return false;
    }

    const buildingFqn = building.fqn ?? building.name;

    if (inclusionExpressions.length > 0 && !matchesAnyCompiledExpression(buildingFqn, inclusionExpressions)) {
      return true;
    }

    return matchesAnyCompiledExpression(buildingFqn, exclusionExpressions);
  };

  return { isActive: true, isFiltered };
}

export function collectFilteredBuildings(
  buildings: Record<string, Building>,
  filter: CompiledBuildingFilter
): Building[] {
  if (!filter.isActive) {
    return [];
  }

  const filtered: Building[] = [];
  for (const building of Object.values(buildings)) {
    if (filter.isFiltered(building)) {
      filtered.push(building);
    }
  }
  return filtered;
}

export function countRemainingBuildings(buildings: Record<string, Building>, filter: CompiledBuildingFilter): number {
  const buildingList = Object.values(buildings);
  if (!filter.isActive) {
    return buildingList.length;
  }

  let remaining = 0;
  for (const building of buildingList) {
    if (!filter.isFiltered(building)) {
      remaining++;
    }
  }
  return remaining;
}
