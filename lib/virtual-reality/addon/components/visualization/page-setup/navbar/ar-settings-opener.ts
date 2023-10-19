import { action } from '@ember/object';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';

interface ArSettingsOpenerArgs {
  toggleSettingsSidebarComponent(componentPath: string): boolean;
}

export default class ArSettingsOpener extends Component<ArSettingsOpenerArgs> {
  @tracked
  isOpen = false;

  @action
  showSettings() {
    this.isOpen = this.args.toggleSettingsSidebarComponent(
      'ar-settings-selector'
    );
  }
}
