import { action } from '@ember/object';
import Component from '@glimmer/component';

interface Args {
  components: string[];
  componentTitle: string;
  componentId: string;
  toggleComponent(componentPath: string): boolean;
}

export default class ComponentOpener extends Component<Args> {
  get isOpen() {
    return this.args.components?.includes(this.args.componentId);
  }

  @action
  toggleComponent() {
    this.args.toggleComponent(this.args.componentId);
  }
}
