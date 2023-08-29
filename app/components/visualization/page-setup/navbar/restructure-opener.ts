import { action } from '@ember/object';
import Component from '@glimmer/component';

interface Args {
  toggleSettingsSidebarComponent(componentPath: string): void;
}

export default class VisualizationPageSetupNavbarRestructureOpener extends Component<Args> {
  @action
  showRestructure() {
    this.args.toggleSettingsSidebarComponent('restructure-landscape');
  }
}
