import { action } from '@ember/object';
import Component from '@glimmer/component';

interface Args {
  toggleToolsSidebarComponent(componentPath: string): void;
}

export default class VisualizationPageSetupNavbarApplicationSearchOpener extends Component<Args> {
  @action
  showTool() {
    this.args.toggleToolsSidebarComponent('application-search');
  }
}
