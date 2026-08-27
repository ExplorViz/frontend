import { type EntityFilterMode } from 'explorviz-frontend/src/stores/entity-filtering-store';
import {
  type Building,
  type Language,
} from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import {
  compileSearchExpressions,
  matchesAnyCompiledExpression,
} from 'explorviz-frontend/src/utils/search-expression-matcher';
import { normalizeLanguage } from 'explorviz-frontend/src/utils/settings/language-settings';
import { BUILDING_METRIC_NAMES } from 'explorviz-frontend/src/utils/settings/settings-schemas';

export type BuildingFilterCriteria = {
  filterMode: EntityFilterMode;
  hiddenLanguages: ReadonlySet<Language>;
  inclusionExpressions: readonly string[];
  exclusionExpressions: readonly string[];
  metricThresholds: Record<string, number>;
};

export type CompiledBuildingFilter = {
  /**
   * False when no criterion can exclude anything, letting callers skip the scan
   * over all buildings entirely.
   */
  readonly isActive: boolean;
  readonly isFiltered: (building: Building) => boolean;
};

const getMetricValue = (building: Building, metricKey: string): number =>
  building.metrics?.[metricKey]?.current ?? 0;

const NOTHING_FILTERED: CompiledBuildingFilter = {
  isActive: false,
  isFiltered: () => false,
};

/**
 * Resolves the filter criteria into a predicate once, instead of re-deriving
 * per-building work (regex compilation, threshold lookups) for every candidate.
 */
export function compileBuildingFilter(
  criteria: BuildingFilterCriteria
): CompiledBuildingFilter {
  // In "Hide" mode a hidden language is applied by the visibility checks rather
  // than by removing the building from the landscape.
  const filtersByLanguage =
    criteria.filterMode === 'Remove' && criteria.hiddenLanguages.size > 0;

  // Metric values default to zero and thresholds default to the metric minimum
  // of zero, so only a positive threshold can exclude anything.
  const activeMetricNames = BUILDING_METRIC_NAMES.filter(
    (metricName) => (criteria.metricThresholds[metricName] ?? 0) > 0
  );

  const inclusionExpressions = compileSearchExpressions(
    criteria.inclusionExpressions
  );
  const exclusionExpressions = compileSearchExpressions(
    criteria.exclusionExpressions
  );

  const matchesFqn =
    inclusionExpressions.length > 0 || exclusionExpressions.length > 0;

  if (!filtersByLanguage && activeMetricNames.length === 0 && !matchesFqn) {
    return NOTHING_FILTERED;
  }

  const isFiltered = (building: Building): boolean => {
    if (
      filtersByLanguage &&
      criteria.hiddenLanguages.has(normalizeLanguage(building.language))
    ) {
      return true;
    }

    for (const metricName of activeMetricNames) {
      if (
        getMetricValue(building, metricName) <
        criteria.metricThresholds[metricName]
      ) {
        return true;
      }
    }

    if (!matchesFqn) {
      return false;
    }

    const buildingFqn = building.fqn ?? building.name;

    if (
      inclusionExpressions.length > 0 &&
      !matchesAnyCompiledExpression(buildingFqn, inclusionExpressions)
    ) {
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

export function countRemainingBuildings(
  buildings: Record<string, Building>,
  filter: CompiledBuildingFilter
): number {
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
