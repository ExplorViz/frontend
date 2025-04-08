import { Metric } from 'explorviz-frontend/src/utils/metric-schemes/metric-data';
import HelpTooltip from 'explorviz-frontend/src/components/help-tooltip.tsx';
import { useHeatmapConfigurationStore } from 'explorviz-frontend/src/stores/heatmap/heatmap-configuration';
import Select from 'react-select';

const formatOptionLabel = (metric: Metric) => (
  <div style={{ display: 'flex' }}>
    <div>{metric.name}</div>
    <div style={{ marginLeft: '10px' }}>
      <HelpTooltip title={metric.description} placement="right" />
    </div>
  </div>
);

export default function MetricSelector() {
  const latestClazzMetricScores =
    useHeatmapConfigurationStore(
      (state) => state.getLatestClazzMetricScores
    )() ?? [];

  const selectedMetric = useHeatmapConfigurationStore(
    (state) => state.getSelectedMetric
  )();

  const selectMetric = useHeatmapConfigurationStore(
    (state) => state.updateMetric
  );

  useHeatmapConfigurationStore((state) => state.selectedMetricName); // For reactivity on metric change
  useHeatmapConfigurationStore((state) => state.currentApplication); // For reactivity on application change

  return (
    <Select
      options={latestClazzMetricScores}
      value={selectedMetric}
      formatOptionLabel={formatOptionLabel}
      onChange={(metric) => {
        selectMetric(metric!);
      }}
      placeholder="Select metric..."
      isSearchable={false}
      isClearable={false}
      isMulti={false}
      getOptionValue={(option) => option.name}
    />
  );
}
