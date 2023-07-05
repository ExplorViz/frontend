import { action } from '@ember/object';
import Component from '@glimmer/component';

interface ArSettingsOpenerArgs {
  toggleSidebarComponent(componentPath: string): void;
}

export default class ArSettingsOpener extends Component<ArSettingsOpenerArgs> {
  @action
  showSettings() {
    this.args.toggleSidebarComponent('ar-settings-selector');
  }
}
