import { action } from '@ember/object';
import Component from '@glimmer/component';

interface Args {
  addComponent(componentPath: string): void;
}

export default class VisualizationPageSetupNavbarRestructureOpener extends Component<Args> {
  @action
  showRestructure() {
    this.args.addComponent('restructure-landscape');
  }
}
