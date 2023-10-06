import { action } from '@ember/object';
import Component from '@glimmer/component';

interface VscodeExtensionSettingsOpenerArgs {
  toggleSettingsSidebarComponent(componentPath: string): void;
}

export default class VscodeExtensionSettingsOpener extends Component<VscodeExtensionSettingsOpenerArgs> {
  @action
  showVSCodeSettings() {
    this.args.toggleSettingsSidebarComponent('vscode-extension-settings');
  }
}
