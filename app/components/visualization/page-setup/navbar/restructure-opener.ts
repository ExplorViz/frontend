import { action } from '@ember/object';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';

interface Args {
  toggleSettingsSidebarComponent(componentPath: string): boolean;
}

export default class VisualizationPageSetupNavbarRestructureOpener extends Component<Args> {
  @tracked
  isOpen = false;

  @action
  showRestructure() {
    this.isOpen = this.args.toggleSettingsSidebarComponent(
      'restructure-landscape'
    );
  }
}
