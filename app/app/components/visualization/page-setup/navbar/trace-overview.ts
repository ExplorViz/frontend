import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import Component from '@glimmer/component';
import LandscapeListener from 'explorviz-frontend/services/landscape-listener';
import AlertifyHandler from 'explorviz-frontend/utils/alertify-handler';
import { DynamicLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/dynamic/dynamic-data';

interface Args {
  readonly dynamicData: DynamicLandscapeData;
  readonly visualizationPaused: boolean;
  toggleSettingsSidebarComponent(componentPath: string): void;
  toggleVisualizationUpdating(): void;
}

export default class TraceOverview extends Component<Args> {
  @service('landscape-listener') landscapeListener!: LandscapeListener;

  @action
  showTraces() {
    const { dynamicData, visualizationPaused, toggleVisualizationUpdating } =
      this.args;

    if (dynamicData.length === 0) {
      AlertifyHandler.showAlertifyMessage('No Traces found!');
      return;
    }
    if (!visualizationPaused) {
      toggleVisualizationUpdating();
    }
    AlertifyHandler.showAlertifyMessage('Visualization paused!');
    this.args.toggleSettingsSidebarComponent('trace-selection');
  }
}
