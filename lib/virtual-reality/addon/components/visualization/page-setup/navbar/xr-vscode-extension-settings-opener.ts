import { action } from '@ember/object';
import Component from '@glimmer/component';

interface ArVSCodeExtensionSettingsOpenerArgs {
  addComponent(componentPath: string): void;
}

export default class ArVSCodeExtensionSettingsOpener extends Component<ArVSCodeExtensionSettingsOpenerArgs> {
  @action
  showVSCodeSettings() {
    this.args.addComponent('xr-vscode-extension-settings');
  }
}
