import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import Component from '@glimmer/component';
import { DynamicLandscapeData } from 'react-lib/src/utils/landscape-schemes/dynamic/dynamic-data';
import { useToastHandlerStore } from 'react-lib/src/stores/toast-handler';

interface Args {
  readonly dynamicData: DynamicLandscapeData;
  readonly visualizationPaused: boolean;

  toggleSettingsSidebarComponent(componentPath: string): void;

  toggleVisualizationUpdating(): void;
}

export default class TraceOverview extends Component<Args> {
  @action
  showTraces() {
    const { dynamicData, visualizationPaused, toggleVisualizationUpdating } =
      this.args;

    if (dynamicData.length === 0) {
      useToastHandlerStore.getState().showInfoToastMessage('No Traces found!');
      return;
    }
    if (!visualizationPaused) {
      toggleVisualizationUpdating();
    }
    useToastHandlerStore
      .getState()
      .showInfoToastMessage('Visualization paused!');
    this.args.toggleSettingsSidebarComponent('trace-selection');
  }
}
