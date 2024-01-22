import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import HeatmapConfiguration from 'heatmap/services/heatmap-configuration';

interface HeatmapButtonArgs {
  toggleHeatmap(): void;
}

export default class HeatmapButton extends Component<HeatmapButtonArgs> {
  @service('heatmap-configuration')
  heatmapConf!: HeatmapConfiguration;
}
