import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';

import BuildingMetricFiltering, {
  BuildingMetricFilteringHandle,
} from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/toolbar/entity-filtering/structure-filtering/building-metric-filtering';
import { useEntityFilteringStore } from 'explorviz-frontend/src/stores/entity-filtering-store';
import { useRenderingServiceStore } from 'explorviz-frontend/src/stores/rendering-service';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import {
  Building,
  FlatLandscape,
} from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import {
  isExcludedBySearchExpressions,
  isIncludedBySearchExpressions,
} from 'explorviz-frontend/src/utils/search-expression-matcher';
import { normalizeLanguage } from 'explorviz-frontend/src/utils/settings/language-settings';
import { BUILDING_METRIC_NAMES } from 'explorviz-frontend/src/utils/settings/settings-schemas';
import { useShallow } from 'zustand/react/shallow';

interface StructureFilteringProps {
  readonly flatLandscapeData: FlatLandscape;
}

export type StructureFilteringHandle = {
  setMinMethodCount: (value: number) => void;
  reset: () => void;
};

const getMetricValue = (building: Building, metricKey: string): number =>
  building.metrics?.[metricKey]?.current ?? 0;

const getMetricBounds = (
  landscape: FlatLandscape
): Record<string, { min: number; max: number }> => {
  const buildings = Object.values(landscape.buildings);
  const metricBounds: Record<string, { min: number; max: number }> = {};

  BUILDING_METRIC_NAMES.forEach((metricName) => {
    if (buildings.length === 0) {
      metricBounds[metricName] = { min: 0, max: 0 };
      return;
    }

    const max = buildings.reduce((acc, building) => {
      const val = getMetricValue(building, metricName);
      return Math.max(acc, val);
    }, Number.NEGATIVE_INFINITY);

    metricBounds[metricName] = {
      min: 0,
      max: Number.isFinite(max) ? max : 0,
    };
  });

  return metricBounds;
};

const StructureFiltering = forwardRef<
  StructureFilteringHandle,
  StructureFilteringProps
>(function StructureFiltering({ flatLandscapeData }, ref) {
  const pauseVisualizationUpdating = useRenderingServiceStore(
    (state) => state.pauseVisualizationUpdating
  );
  const hiddenLanguages = useVisualizationStore(
    (state) => state.hiddenLanguages
  );
  const {
    filterMode,
    inclusionExpressions,
    exclusionExpressions,
    metricThresholds,
    setMetricThreshold,
    setMinMethodCount,
    resetFilters,
  } = useEntityFilteringStore(
    useShallow((state) => ({
      filterMode: state.filterMode,
      inclusionExpressions: state.inclusionExpressions,
      exclusionExpressions: state.exclusionExpressions,
      metricThresholds: state.metricThresholds,
      setMetricThreshold: state.actions.setMetricThreshold,
      setMinMethodCount: state.actions.setMinMethodCount,
      resetFilters: state.actions.resetFilters,
    }))
  );

  const buildingMetricRef = useRef<BuildingMetricFilteringHandle>(null);
  const metricBounds = useMemo(
    () => getMetricBounds(flatLandscapeData),
    [flatLandscapeData]
  );
  const initialBuildingCount = Object.keys(flatLandscapeData.buildings).length;

  const inclusionExpressionValues = inclusionExpressions.map(
    (option) => option.value
  );
  const exclusionExpressionValues = exclusionExpressions.map(
    (option) => option.value
  );

  const numRemainingBuildingsAfterFiltering = useMemo(() => {
    const filteredCount = Object.values(flatLandscapeData.buildings).filter(
      (building) => {
        const language = normalizeLanguage(building.language);
        const isFilteredByLanguage =
          filterMode === 'Remove' && hiddenLanguages.has(language);
        const isFilteredByMetric = BUILDING_METRIC_NAMES.some(
          (metricName) =>
            getMetricValue(building, metricName) <
            (metricThresholds[metricName] ?? 0)
        );
        const buildingFqn = building.fqn ?? building.name;
        const isFilteredByFqn =
          !isIncludedBySearchExpressions(
            buildingFqn,
            inclusionExpressionValues
          ) ||
          isExcludedBySearchExpressions(buildingFqn, exclusionExpressionValues);
        return !(isFilteredByLanguage || isFilteredByMetric || isFilteredByFqn);
      }
    ).length;
    return filteredCount;
  }, [
    flatLandscapeData,
    filterMode,
    hiddenLanguages,
    inclusionExpressionValues,
    exclusionExpressionValues,
    metricThresholds,
  ]);

  const updateMetricThreshold = (metric: string, value: number) => {
    pauseVisualizationUpdating();
    setMetricThreshold(metric, value);
  };

  useImperativeHandle(ref, () => ({
    setMinMethodCount,
    reset: () => {
      resetFilters();
    },
  }));

  return (
    <>
      <h6 className="mb-3 mt-3">
        <strong>
          Buildings (# shown:
          {numRemainingBuildingsAfterFiltering}/{initialBuildingCount})
        </strong>
      </h6>

      <BuildingMetricFiltering
        ref={buildingMetricRef}
        metricBounds={metricBounds}
        selectedMetricThresholds={metricThresholds}
        updateMetricThreshold={updateMetricThreshold}
        remainingEntityCountAfterFiltering={numRemainingBuildingsAfterFiltering}
        initialEntityCount={initialBuildingCount}
      />
    </>
  );
});

export default StructureFiltering;
