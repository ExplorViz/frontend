import { action } from '@ember/object';
import Component from '@glimmer/component';

interface VscodeExtensionSettingsOpenerArgs {
  toggleSidebarComponent(componentPath: string): void;
}

export default class VscodeExtensionSettingsOpener extends Component<VscodeExtensionSettingsOpenerArgs> {
  @action
  showVSCodeSettings() {
    this.args.toggleSidebarComponent('vscode-extension-settings');
  }
}
