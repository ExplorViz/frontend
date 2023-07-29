import { action } from '@ember/object';
import Component from '@glimmer/component';

interface ArVSCodeExtensionSettingsOpenerArgs {
  toggleSidebarComponent(componentPath: string): void;
}

export default class ArVSCodeExtensionSettingsOpener extends Component<ArVSCodeExtensionSettingsOpenerArgs> {
  @action
  showVSCodeSettings() {
    this.args.toggleSidebarComponent('xr-vscode-extension-settings');
  }
}
