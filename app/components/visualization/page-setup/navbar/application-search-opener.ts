import { action } from '@ember/object';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';

interface Args {
  toggleToolsSidebarComponent(componentPath: string): boolean;
}

export default class VisualizationPageSetupNavbarApplicationSearchOpener extends Component<Args> {
  @tracked
  isOpen = false;

  @action
  showTool() {
    this.isOpen = this.args.toggleToolsSidebarComponent('application-search');
    console.log('isOpen:', this.isOpen);
  }
}
