import Component from '@glimmer/component';
import CollaborationSession from 'collaborative-mode/services/collaboration-session';
import { inject as service } from '@ember/service';

interface AutoJoinLobbyArgs {
  roomId: string;
}

/**
 * Heart of the automatic initiation of the synchronization feature.
 * Effectivly setting up SychronizationSession and providing access to
 * projector identification and specific collaboration session via query parameter.
 */
export default class AutoJoinLobby extends Component<AutoJoinLobbyArgs> {
  @service('collaboration-session')
  collaboration!: CollaborationSession;

  constructor(owner: unknown, args: AutoJoinLobbyArgs) {
    super(owner, args);

    if (this.args.roomId) {
      setTimeout(() => {
        this.collaboration.hostRoom(this.args.roomId);
      }, 2500);
    }
  }
}
