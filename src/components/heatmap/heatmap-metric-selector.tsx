import {
  BuildingMetricIds,
  ORDERED_BUILDING_METRIC_IDS,
  useHeatmapStore,
} from 'explorviz-frontend/src/stores/heatmap/heatmap-store';
import { useShallow } from 'zustand/react/shallow';

export default function MetricSelector() {
  const { selectedClassMetric, setSelectedClassMetric } = useHeatmapStore(
    useShallow((state) => ({
      heatmapShared: state.heatmapShared,
      selectedClassMetric: state.selectedBuildingMetric,
      setSelectedClassMetric: state.setSelectedBuildingMetric,
      toggleShared: state.toggleShared,
    }))
  );

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
          {name}
        </option>
      ))}
    </select>
  );
}
