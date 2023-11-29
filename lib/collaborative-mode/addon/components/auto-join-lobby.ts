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
      this.autoJoinLobby();
    }
  }

  async autoJoinLobby(retries = 3) {
    const roomHosted = await this.collaboration.hostRoom(this.args.roomId);

    if (roomHosted) {
      console.log('Successfully auto joined room');
    } else if (!roomHosted && retries <= 0) {
      console.log('Failed to auto join room, no retries left');
    } else {
      console.log('Failed to auto join room, retrying in 2 seconds again...');
      setTimeout(() => {
        this.autoJoinLobby(retries - 1);
      }, 2000);
    }
  }
}
