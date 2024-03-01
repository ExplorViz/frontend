import { action } from '@ember/object';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';

interface Args {
  componentTitle: string;
  componentId: string;
  toggleComponent(componentPath: string): boolean;
}

export default class ComponentOpener extends Component<Args> {
  @tracked
  isOpen = false;

  @action
  toggleComponent() {
    this.isOpen = this.args.toggleComponent(this.args.componentId);
  }
}
