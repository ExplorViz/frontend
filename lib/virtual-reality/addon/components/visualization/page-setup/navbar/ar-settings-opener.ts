import { action } from '@ember/object';
import Component from '@glimmer/component';

interface ArSettingsOpenerArgs {
  addComponent(componentPath: string): void;
}

export default class ArSettingsOpener extends Component<ArSettingsOpenerArgs> {
  @action
  showSettings() {
    this.args.addComponent('ar-settings-selector');
  }
}
