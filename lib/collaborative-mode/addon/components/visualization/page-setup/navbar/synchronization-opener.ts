import { action } from '@ember/object';
import Component from '@glimmer/component';

interface SynchronizationOpenerArgs {
  toggleSidebarComponent(componentPath: string): void;
}

export default class SynchronizationOpener extends Component<SynchronizationOpenerArgs> {
  @action
  showSynchronization() {
    this.args.toggleSidebarComponent('synchronization-controls');
  }
}
