import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import HeatmapConfiguration from 'explorviz-frontend/services/heatmap/heatmap-configuration';

interface HeatmapButtonArgs {
  toggleHeatmap(): void;
}

export default class HeatmapButton extends Component<HeatmapButtonArgs> {
  @service('heatmap/heatmap-configuration')
  heatmapConf!: HeatmapConfiguration;
}
