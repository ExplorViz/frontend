import Component from '@glimmer/component';
import HeatmapConfiguration from 'heatmap/services/heatmap-configuration';
import { inject as service } from '@ember/service';
import { Metric } from 'explorviz-frontend/utils/metric-schemes/metric-data';

interface Args {
  selectMetric(metric: Metric): void;
}

export default class MetricSelector extends Component<Args> {
  @service('heatmap-configuration')
  heatmapConfiguration!: HeatmapConfiguration;

  get metricNames() {
    return this.heatmapConfiguration.latestClazzMetricScores;
  }
}
