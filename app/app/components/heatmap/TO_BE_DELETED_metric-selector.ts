import Component from '@glimmer/component';
import { Metric } from 'react-lib/src/utils/metric-schemes/metric-data';
import HelpTooltip from 'react-lib/src/components/help-tooltip.tsx';
import { useHeatmapConfigurationStore } from 'react-lib/src/stores/heatmap/heatmap-configuration';

interface Args {
  selectMetric(metric: Metric): void;
}

export default class MetricSelector extends Component<Args> {
  helpTooltipComponent = HelpTooltip;

  get metricNames() {
    return useHeatmapConfigurationStore.getState().getLatestClazzMetricScores();
  }
}
