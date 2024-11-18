import Component from '@glimmer/component';
import HeatmapConfiguration, {
  Metric,
} from 'heatmap/services/heatmap-configuration';
import { inject as service } from '@ember/service';

interface Args {
  selectMetric(metric: Metric): void;
}

export default class MetricSelector extends Component<Args> {
  @service('heatmap-configuration')
  heatmapConfiguration!: HeatmapConfiguration;

  get metricNames() {
    console.log(this.heatmapConfiguration.latestClazzMetricScores);
    return this.heatmapConfiguration.latestClazzMetricScores;
  }
}
