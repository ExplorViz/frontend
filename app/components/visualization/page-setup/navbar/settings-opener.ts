import { action } from '@ember/object';
import Component from '@glimmer/component';

interface Args {
  addComponent(componentPath: string): void
}

export default class VisualizationPageSetupNavbarSettingsOpener extends Component<Args> {
  @action
  showSettings() {
    this.args.addComponent('settings');
    this.args.addComponent('app-settings');
  }
}
