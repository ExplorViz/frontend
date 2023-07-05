import { action } from '@ember/object';
import Component from '@glimmer/component';

interface Args {
  toggleSidebarComponent(componentPath: string): void;
}

export default class VisualizationPageSetupNavbarSettingsOpener extends Component<Args> {
  @action
  showSettings() {
    this.args.toggleSidebarComponent('settings');
  }
}
