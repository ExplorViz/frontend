import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import Component from '@glimmer/component';
import ToastHandlerService from 'explorviz-frontend/services/toast-handler';
import { DynamicLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/dynamic/dynamic-data';

interface Args {
  readonly dynamicData: DynamicLandscapeData;
  readonly visualizationPaused: boolean;
  toggleSettingsSidebarComponent(componentPath: string): void;
  toggleVisualizationUpdating(): void;
}

export default class TraceOverview extends Component<Args> {
  @service('toast-handler')
  toastHandlerService!: ToastHandlerService;

  @action
  showTraces() {
    const { dynamicData, visualizationPaused, toggleVisualizationUpdating } =
      this.args;

    if (dynamicData.length === 0) {
      this.toastHandlerService.showInfoToastMessage('No Traces found!');
      return;
    }
    if (!visualizationPaused) {
      toggleVisualizationUpdating();
    }
    this.toastHandlerService.showInfoToastMessage('Visualization paused!');
    this.args.toggleSettingsSidebarComponent('trace-selection');
  }
}
