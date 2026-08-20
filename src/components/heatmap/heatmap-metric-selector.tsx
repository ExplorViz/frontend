import { useCommitTreeStateStore } from 'explorviz-frontend/src/stores/commit-tree-state';
import {
  BuildingMetricIds,
  ORDERED_BUILDING_METRIC_IDS,
  useHeatmapStore,
} from 'explorviz-frontend/src/stores/heatmap/heatmap-store';
import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';
import { formatBuildingMetricDisplayName } from 'explorviz-frontend/src/utils/settings/building-metrics';
import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';

export default function MetricSelector() {
  const currentSelectedRepo = useCommitTreeStateStore(
    (state) => state._currentSelectedRepositoryName
  );
  const isCommitComparisonMode =
    (useCommitTreeStateStore(
      (state) => state._selectedCommits.get(currentSelectedRepo)?.length
    ) ?? 0) === 2;
  const buildings = useModelStore((state) => state.buildings);

  const {
    selectedClassMetric,
    setSelectedClassMetric,
    refreshSelectedMetricBounds,
  } = useHeatmapStore(
    useShallow((state) => ({
      selectedClassMetric: state.selectedBuildingMetric,
      setSelectedClassMetric: state.setSelectedBuildingMetric,
      refreshSelectedMetricBounds: state.refreshSelectedMetricBounds,
    }))
  );

  useEffect(() => {
    if (selectedClassMetric.name === BuildingMetricIds.None) {
      return;
    }

    refreshSelectedMetricBounds();
  }, [
    buildings,
    isCommitComparisonMode,
    refreshSelectedMetricBounds,
    selectedClassMetric.name,
  ]);

  return (
    <select
      value={selectedClassMetric.name ?? 'None'}
      style={{ width: '200px' }}
      onChange={(e) => {
        const val = e.target.value;
        setSelectedClassMetric(val as BuildingMetricIds);
      }}
      aria-label="Select metric"
      className="border rounded-md px-2 py-1 w-full"
    >
      {ORDERED_BUILDING_METRIC_IDS.map((name) => (
        <option key={name} value={name}>
          {formatBuildingMetricDisplayName(name, isCommitComparisonMode)}
        </option>
      ))}
    </select>
  );
}
