import { action } from '@ember/object';
import Component from '@glimmer/component';

interface ArSettingsOpenerArgs {
  toggleSettingsSidebarComponent(componentPath: string): void;
}

export default class ArSettingsOpener extends Component<ArSettingsOpenerArgs> {
  @action
  showXrCollaboration() {
    this.args.toggleSettingsSidebarComponent('xr-collaboration');
  }
}
