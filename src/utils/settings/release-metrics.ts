import { UNBOUNDED_METRIC_RANGE, useEntityFilteringStore } from 'explorviz-frontend/src/stores/entity-filtering-store';
import { BuildingMetricIds, useHeatmapStore } from 'explorviz-frontend/src/stores/heatmap/heatmap-store';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { BUILDING_DIMENSION_SETTINGS } from 'explorviz-frontend/src/utils/settings/building-config-settings';
import { getDisabledMetrics, isActiveMetricRange } from 'explorviz-frontend/src/utils/settings/metric-settings';
import { SelectedBuildingMetric } from 'explorviz-frontend/src/utils/settings/settings-schemas';

/** Stops using metrics in the heatmap, the filters and the Building Config. */
function releaseMetrics(metrics: ReadonlySet<string>) {
  const heatmap = useHeatmapStore.getState();
  if (metrics.has(heatmap.selectedBuildingMetric.name)) {
    heatmap.setSelectedBuildingMetric(BuildingMetricIds.None);
  }

  const { metricRanges, actions } = useEntityFilteringStore.getState();
  if ([...metrics].some((metric) => isActiveMetricRange(metricRanges[metric]))) {
    actions.setMetricRanges(
      Object.fromEntries(
        Object.entries(metricRanges).map(([metric, range]) => [
          metric,
          metrics.has(metric) ? UNBOUNDED_METRIC_RANGE : range,
        ])
      )
    );
  }

  // In a Room, the Host's choice for the width and depth takes effect again right away.
  for (const { metricSettingId } of Object.values(BUILDING_DIMENSION_SETTINGS)) {
    const { visualizationSettings, updateSetting } = useUserSettingsStore.getState();
    if (metrics.has(String(visualizationSettings[metricSettingId].value))) {
      updateSetting(metricSettingId, SelectedBuildingMetric.None);
    }
  }
}

/** Performs a change of the settings and stops using the metrics that it disables. */
export function changeMetricSettings(change: () => void) {
  const getDisabled = () => getDisabledMetrics(useUserSettingsStore.getState().visualizationSettings);
  const disabledBefore = getDisabled();
  change();
  releaseMetrics(new Set([...getDisabled()].filter((metric) => !disabledBefore.has(metric))));
}
