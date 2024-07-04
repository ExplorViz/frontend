import Component from '@glimmer/component';
import HeatmapConfiguration, {
  Metric,
} from 'heatmap/services/heatmap-configuration';
import { inject as service } from '@ember/service';
import debugLogger from 'ember-debug-logger';

interface Args {
  selectMetric(metric: Metric): void;
}

export default class MetricSelector extends Component<Args> {
  @service('heatmap-configuration')
  heatmapConfiguration!: HeatmapConfiguration;

  debug = debugLogger('MetricSelector');

  get metricNames() {
    this.debug(this.heatmapConfiguration.latestClazzMetricScores);
    return this.heatmapConfiguration.latestClazzMetricScores;
  }
}
