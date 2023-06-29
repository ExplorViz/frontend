import { action } from '@ember/object';
import Component from '@glimmer/component';

interface SynchronizationOpenerArgs {
  addComponent(componentPath: string): void;
}

export default class SynchronizationOpener extends Component<SynchronizationOpenerArgs > {
  @action
  showSynchronization() {
    this.args.addComponent('synchronization');
  }
}
