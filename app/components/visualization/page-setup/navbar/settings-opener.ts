import { action } from '@ember/object';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';

interface Args {
  toggleSettingsSidebarComponent(componentPath: string): boolean;
}

export default class VisualizationPageSetupNavbarSettingsOpener extends Component<Args> {
  @tracked
  isOpen = false;

  @action
  showSettings() {
    this.isOpen = this.args.toggleSettingsSidebarComponent('settings');
  }
}
