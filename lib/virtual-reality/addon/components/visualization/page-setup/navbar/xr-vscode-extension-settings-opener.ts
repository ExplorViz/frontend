import { action } from '@ember/object';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';

interface ArVSCodeExtensionSettingsOpenerArgs {
  toggleSettingsSidebarComponent(componentPath: string): boolean;
}

export default class ArVSCodeExtensionSettingsOpener extends Component<ArVSCodeExtensionSettingsOpenerArgs> {
  @tracked
  isOpen = false;

  @action
  showVSCodeSettings() {
    this.isOpen = this.args.toggleSettingsSidebarComponent(
      'xr-vscode-extension-settings'
    );
  }
}
