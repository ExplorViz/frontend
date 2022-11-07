import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import HeatmapConfiguration from 'heatmap/services/heatmap-configuration';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { EmptyObject } from '@glimmer/component/-private/component';

interface HeatmapMode {
  name: string;
  id: string;
}

export default class HeatmapSettings extends Component {
  @service('heatmap-configuration')
  heatmapConf!: HeatmapConfiguration;

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
      this.heatmapConf.selectedMode === 'aggregatedHeatmap'
        ? this.heatmapModes[0]
        : this.heatmapModes[1];
  }

  @action
  setHeatmapMode(mapMode: HeatmapMode) {
    this.selectedMode = mapMode;
    this.heatmapConf.set('selectedMode', mapMode.id);
  }

  @action
  onHeatmapRadiusChange(heatmapRadiusNew: number) {
    this.heatmapConf.set('heatmapRadius', heatmapRadiusNew);
  }

  @action
  onBlurRadiusChange(blurRadiusNew: number) {
    this.heatmapConf.set('blurRadius', blurRadiusNew);
  }

  @action
  toggleLegendValues() {
    this.heatmapConf.toggleProperty('showLegendValues');
  }

  @action
  toggleSimpleHeatSettings() {
    this.showSimpleHeatSettings = !this.showSimpleHeatSettings;
  }

  @action
  resetSimpleHeatGradient() {
    this.heatmapConf.resetSimpleHeatGradient();
  }

  @action
  toggleHelperLines() {
    this.heatmapConf.toggleProperty('useHelperLines');
  }
}
