import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import CollaborationSession from 'collaborative-mode/services/collaboration-session';

interface SynchronizationCheckArgs {
  synchronization: string;
}

export default class SynchronizationCheck extends Component<SynchronizationCheckArgs> {
  @service('collaboration-session')
  collaborationSession!: CollaborationSession;

  get synchronizationChanged() {
    return () => {
      console.log('Synchronization changed to:', this.args.synchronization);
    };
  }
}
