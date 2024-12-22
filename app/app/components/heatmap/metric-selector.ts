import Component from '@glimmer/component';
import HeatmapConfiguration from 'explorviz-frontend/services/heatmap/heatmap-configuration';
import { inject as service } from '@ember/service';
import { Metric } from 'react-lib/src/utils/metric-schemes/metric-data';

interface Args {
  selectMetric(metric: Metric): void;
}

export default class MetricSelector extends Component<Args> {
  @service('heatmap/heatmap-configuration')
  heatmapConfiguration!: HeatmapConfiguration;

  get metricNames() {
    return this.heatmapConfiguration.latestClazzMetricScores;
  }
}
