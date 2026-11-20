import { useImperativeHandle, useMemo, useRef } from 'react';

import BuildingMetricFiltering, {
  BuildingMetricFilteringHandle,
} from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/toolbar/entity-filtering/structure-filtering/building-metric-filtering';
import { useEntityFilteringStore } from 'explorviz-frontend/src/stores/entity-filtering-store';
import { useRenderingServiceStore } from 'explorviz-frontend/src/stores/rendering-service';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import {
  compileBuildingFilter,
  countRemainingBuildings,
} from 'explorviz-frontend/src/utils/city-rendering/building-filter';
import { Building, FlatLandscape } from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import { BUILDING_METRIC_NAMES } from 'explorviz-frontend/src/utils/settings/settings-schemas';
import Form from 'react-bootstrap/Form';
import { useShallow } from 'zustand/react/shallow';

interface StructureFilteringProps {
  readonly flatLandscapeData: FlatLandscape;
}

export type StructureFilteringHandle = {
  setMinMethodCount: (value: number) => void;
  reset: () => void;
};

const getMetricValue = (building: Building, metricKey: string): number => building.metrics?.[metricKey]?.current ?? 0;

const getMetricBounds = (landscape: FlatLandscape): Record<string, { min: number; max: number }> => {
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

const StructureFiltering = function StructureFiltering({
  ref,
  flatLandscapeData: _flatLandscapeData,
}: StructureFilteringProps & {
  ref?: React.RefObject<StructureFilteringHandle | null>;
}) {
  const pauseVisualizationUpdating = useRenderingServiceStore((state) => state.pauseVisualizationUpdating);
  const hiddenModelTypes = useVisualizationStore((state) => state.hiddenModelTypes);
  const hiddenLanguages = useVisualizationStore((state) => state.hiddenLanguages);
  const {
    filterMode,
    inclusionExpressions,
    exclusionExpressions,
    metricThresholds,
    hideEmptyDistricts,
    baselineFlatLandscape,
    setMetricThreshold,
    setHideEmptyDistricts,
    setMinMethodCount,
    resetFilters,
  } = useEntityFilteringStore(
    useShallow((state) => ({
      filterMode: state.filterMode,
      inclusionExpressions: state.inclusionExpressions,
      exclusionExpressions: state.exclusionExpressions,
      metricThresholds: state.metricThresholds,
      hideEmptyDistricts: state.hideEmptyDistricts,
      baselineFlatLandscape: state.baselineFlatLandscape,
      setMetricThreshold: state.actions.setMetricThreshold,
      setHideEmptyDistricts: state.actions.setHideEmptyDistricts,
      setMinMethodCount: state.actions.setMinMethodCount,
      resetFilters: state.actions.resetFilters,
    }))
  );

  const filterSourceFlatLandscape = baselineFlatLandscape ?? _flatLandscapeData;

  const buildingMetricRef = useRef<BuildingMetricFilteringHandle>(null);
  const metricBounds = useMemo(() => getMetricBounds(filterSourceFlatLandscape), [filterSourceFlatLandscape]);
  const initialBuildingCount = Object.keys(filterSourceFlatLandscape.buildings).length;

  // Deriving these inline made them new arrays on every render, which defeated
  // the memo below and re-scanned every building whenever this panel rendered.
  const inclusionExpressionValues = useMemo(
    () => inclusionExpressions.map((option) => option.value),
    [inclusionExpressions]
  );
  const exclusionExpressionValues = useMemo(
    () => exclusionExpressions.map((option) => option.value),
    [exclusionExpressions]
  );

  const numRemainingBuildingsAfterFiltering = useMemo(
    () =>
      countRemainingBuildings(
        filterSourceFlatLandscape.buildings,
        compileBuildingFilter({
          filterMode,
          hiddenModelTypes,
          hiddenLanguages,
          inclusionExpressions: inclusionExpressionValues,
          exclusionExpressions: exclusionExpressionValues,
          metricThresholds,
        })
      ),
    [
      filterSourceFlatLandscape,
      filterMode,
      hiddenModelTypes,
      hiddenLanguages,
      inclusionExpressionValues,
      exclusionExpressionValues,
      metricThresholds,
    ]
  );

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
        <strong>Districts</strong>
      </h6>
      <Form.Check
        type="checkbox"
        id="hide-empty-districts"
        label={`${filterMode === 'Remove' ? 'Remove' : 'Hide'} districts without buildings`}
        title={
          filterMode === 'Remove'
            ? 'Removes districts that directly contain no buildings. Their inner districts move up to the parent and the layout becomes more compact.'
            : 'Hides districts that directly contain no buildings. Their inner districts stay visible and the layout is unchanged.'
        }
        checked={hideEmptyDistricts}
        onChange={(event) => setHideEmptyDistricts(event.target.checked)}
      />

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
};

export default StructureFiltering;
