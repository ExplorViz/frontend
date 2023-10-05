import { action } from '@ember/object';
import Component from '@glimmer/component';

interface ArVSCodeExtensionSettingsOpenerArgs {
  toggleSettingsSidebarComponent(componentPath: string): void;
}

export default class ArVSCodeExtensionSettingsOpener extends Component<ArVSCodeExtensionSettingsOpenerArgs> {
  @action
  showVSCodeSettings() {
    this.args.toggleSettingsSidebarComponent('xr-vscode-extension-settings');
  }
}
