import { action } from '@ember/object';
import Component from '@glimmer/component';

interface Args {
  openedComponent: string | null;
  componentTitle: string;
  componentId: string;
  toggleComponent(componentPath: string): boolean;
}

export default class ComponentOpener extends Component<Args> {
  get isOpen() {
    return this.args.openedComponent === this.args.componentId;
  }

  @action
  toggleComponent() {
    this.args.toggleComponent(this.args.componentId);
  }
}
