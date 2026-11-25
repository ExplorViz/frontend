import { useImperativeHandle, useMemo, useRef, useState } from 'react';

import BuildingMetricFiltering, {
  BuildingMetricFilteringHandle,
} from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/toolbar/entity-filtering/structure-filtering/building-metric-filtering';
import useDisabledMetrics from 'explorviz-frontend/src/hooks/useDisabledMetrics';
import { MetricRange, useEntityFilteringStore } from 'explorviz-frontend/src/stores/entity-filtering-store';
import { useRenderingServiceStore } from 'explorviz-frontend/src/stores/rendering-service';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import {
  compileBuildingFilter,
  countRemainingBuildings,
  getMetricFilterBounds,
} from 'explorviz-frontend/src/utils/city-rendering/building-filter';
import { FlatLandscape } from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import { isActiveMetricRange } from 'explorviz-frontend/src/utils/settings/metric-settings';
import Form from 'react-bootstrap/Form';
import { useShallow } from 'zustand/react/shallow';

interface StructureFilteringProps {
  readonly flatLandscapeData: FlatLandscape;
}

export type StructureFilteringHandle = {
  setMinMethodCount: (value: number) => void;
  reset: () => void;
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
    metricRanges,
    hideEmptyDistricts,
    baselineFlatLandscape,
    setMetricRange,
    setHideEmptyDistricts,
    setMinMethodCount,
    resetFilters,
  } = useEntityFilteringStore(
    useShallow((state) => ({
      filterMode: state.filterMode,
      inclusionExpressions: state.inclusionExpressions,
      exclusionExpressions: state.exclusionExpressions,
      metricRanges: state.metricRanges,
      hideEmptyDistricts: state.hideEmptyDistricts,
      baselineFlatLandscape: state.baselineFlatLandscape,
      setMetricRange: state.actions.setMetricRange,
      setHideEmptyDistricts: state.actions.setHideEmptyDistricts,
      setMinMethodCount: state.actions.setMinMethodCount,
      resetFilters: state.actions.resetFilters,
    }))
  );

  const filterSourceFlatLandscape = baselineFlatLandscape ?? _flatLandscapeData;

  // Range being dragged but not yet applied. Applying a range rebuilds the city,
  // so during a drag only the controls and the building count follow the thumb.
  const [previewedMetricRange, setPreviewedMetricRange] = useState<{ metric: string; range: MetricRange } | null>(null);
  const displayedMetricRanges = useMemo(
    () =>
      previewedMetricRange
        ? { ...metricRanges, [previewedMetricRange.metric]: previewedMetricRange.range }
        : metricRanges,
    [metricRanges, previewedMetricRange]
  );

  const buildingMetricRef = useRef<BuildingMetricFilteringHandle>(null);
  const metricBounds = useMemo(
    () => getMetricFilterBounds(filterSourceFlatLandscape.buildings),
    [filterSourceFlatLandscape]
  );
  const disabledMetrics = useDisabledMetrics();
  // A disabled metric stays listed while it filters, i.e. if its range was set without these controls.
  const listedMetricBounds = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(metricBounds).filter(
          ([metric]) => !disabledMetrics.has(metric) || isActiveMetricRange(metricRanges[metric])
        )
      ),
    [metricBounds, disabledMetrics, metricRanges]
  );
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
          metricRanges: displayedMetricRanges,
        })
      ),
    [
      filterSourceFlatLandscape,
      filterMode,
      hiddenModelTypes,
      hiddenLanguages,
      inclusionExpressionValues,
      exclusionExpressionValues,
      displayedMetricRanges,
    ]
  );

  const updateMetricRange = (metric: string, range: MetricRange) => {
    setPreviewedMetricRange(null);
    const current = metricRanges[metric];
    // A click on a thumb without moving it still ends a drag; skip the city rebuild then.
    if (current && current.min === range.min && current.max === range.max) {
      return;
    }
    pauseVisualizationUpdating();
    setMetricRange(metric, range);
  };

  const previewMetricRange = (metric: string, range: MetricRange) => {
    setPreviewedMetricRange({ metric, range });
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
        metricBounds={listedMetricBounds}
        selectedMetricRanges={displayedMetricRanges}
        updateMetricRange={updateMetricRange}
        previewMetricRange={previewMetricRange}
        remainingEntityCountAfterFiltering={numRemainingBuildingsAfterFiltering}
        initialEntityCount={initialBuildingCount}
      />
    </>
  );
};

export default StructureFiltering;
