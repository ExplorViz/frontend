import Component from '@glimmer/component';
import CollaborationSession from 'collaboration/services/collaboration-session';
import { inject as service } from '@ember/service';

interface AutoJoinLobbyArgs {
  roomId: string;
}

export default class AutoJoinLobby extends Component<AutoJoinLobbyArgs> {
  @service('collaboration-session')
  collaboration!: CollaborationSession;

  constructor(owner: unknown, args: AutoJoinLobbyArgs) {
    super(owner, args);

    if (this.args.roomId) {
      this.autoJoinLobby();
    }
  }

  async autoJoinLobby(retries = 5) {
    const roomHosted = await this.collaboration.hostRoom(this.args.roomId);

    if (roomHosted) {
      console.log('Successfully auto joined room');
    } else if (!roomHosted && retries <= 0) {
      console.log('Failed to auto join room, no retries left');
    } else {
      console.log('Failed to auto join room, retrying in 5 seconds again...');
      setTimeout(() => {
        this.autoJoinLobby(retries - 1);
      }, 5000);
    }
  }
}
