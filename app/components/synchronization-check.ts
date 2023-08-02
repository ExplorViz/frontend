import Component from '@glimmer/component';

interface SynchronizationCheckArgs {
  synchronization: string;
}

export default class SynchronizationCheck extends Component<SynchronizationCheckArgs> {
  get synchronizationChanged() {
    return () => {
      console.log('Synchronization changed to:', this.args.synchronization);
    };
  }
}
