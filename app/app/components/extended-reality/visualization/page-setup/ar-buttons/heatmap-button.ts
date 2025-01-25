import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import HeatmapConfiguration from 'explorviz-frontend/services/heatmap/heatmap-configuration';
import { useHeatmapConfigurationStore } from 'react-lib/src/stores/heatmap/heatmap-configuration';

interface HeatmapButtonArgs {
  toggleHeatmap(): void;
}

export default class HeatmapButton extends Component<HeatmapButtonArgs> {
  get isHeatmapActive() {
    return useHeatmapConfigurationStore.getState().heatmapActive;
  }
}
