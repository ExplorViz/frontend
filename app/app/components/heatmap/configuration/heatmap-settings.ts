import Component from '@glimmer/component';
// import { inject as service } from '@ember/service';
// import HeatmapConfiguration from 'explorviz-frontend/services/heatmap/heatmap-configuration';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { EmptyObject } from '@glimmer/component/-private/component';
import HelpTooltip from 'react-lib/src/components/help-tooltip.tsx';
import {
  useHeatmapConfigurationStore,
  HeatmapMode as HeatmapMode2,
} from 'react-lib/src/stores/heatmap/heatmap-configuration';

interface HeatmapMode {
  name: string;
  id: string;
}

export default class HeatmapSettings extends Component {
  helpTooltipComponent = HelpTooltip;

  // @service('heatmap/heatmap-configuration')
  // heatmapConf!: HeatmapConfiguration;

  heatmapModes: HeatmapMode[] = [
    { name: 'Aggregated Heatmap', id: 'aggregatedHeatmap' },
    { name: 'Windowed Heatmap', id: 'windowedHeatmap' },
  ];

  descriptions = {
    heatmapMode:
      'Aggregated Heatmap: The values of previous heatmaps are aggregated and added to the' +
      ' current value. Windowed Heatmap: The metrics are shown as a difference to the previous heatmap.' +
      ' The windowsize can be configured in the backend.',
    helperLines:
      'Show the helper lines to determine which point on the heatmap belongs to which class.',
    shGradient:
      'Configure the simple heat gradient. Use either rgb, hex or css-style format.',
    ahGradient:
      'Configure the array heat gradient. Use either rgb, hex or css-style format.',
    opacityValue:
      'Set the opacity of the package boxes. Choose a value between 0 and 1.',
    showLegendValues:
      'Select wether the raw heatmap values or their abstractions should be shown as label.',
    heatmapRadius: 'The size of each color point.',
    blurRadius: 'The radius at which the colors blur together.',
  };

  @tracked
  selectedMode: HeatmapMode;

  @tracked
  showSimpleHeatSettings: boolean = false;

  constructor(owner: any, args: EmptyObject) {
    super(owner, args);
    this.selectedMode =
      useHeatmapConfigurationStore.getState().selectedMode ===
      'aggregatedHeatmap'
        ? this.heatmapModes[0]
        : this.heatmapModes[1];
  }

  @action
  setHeatmapMode(mapMode: HeatmapMode) {
    this.selectedMode = mapMode;
    useHeatmapConfigurationStore.setState({
      selectedMode: mapMode.id as HeatmapMode2,
    });
    // this.heatmapConf.set('selectedMode', mapMode.id);
  }

  @action
  onHeatmapRadiusChange(heatmapRadiusNew: number) {
    useHeatmapConfigurationStore.setState({ heatmapRadius: heatmapRadiusNew });
  }

  @action
  onBlurRadiusChange(blurRadiusNew: number) {
    useHeatmapConfigurationStore.setState({ blurRadius: blurRadiusNew });
  }

  @action
  toggleLegendValues() {
    useHeatmapConfigurationStore.setState({
      showLegendValues:
        !useHeatmapConfigurationStore.getState().showLegendValues,
    });
  }

  @action
  toggleSimpleHeatSettings() {
    this.showSimpleHeatSettings = !this.showSimpleHeatSettings;
  }

  @action
  resetSimpleHeatGradient() {
    useHeatmapConfigurationStore.getState().resetSimpleHeatGradient();
  }

  @action
  toggleHelperLines() {
    useHeatmapConfigurationStore.setState({
      useHelperLines: !useHeatmapConfigurationStore.getState().useHelperLines,
    });
  }
}
