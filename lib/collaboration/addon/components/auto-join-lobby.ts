import { inject as service } from '@ember/service';
import Component from '@glimmer/component';
import CollaborationSession from 'collaboration/services/collaboration-session';
import debugLogger from 'ember-debug-logger';
import ToastHandlerService from 'explorviz-frontend/services/toast-handler';

interface AutoJoinLobbyArgs {
  roomId: string;
}

export default class AutoJoinLobby extends Component<AutoJoinLobbyArgs> {
  @service('collaboration-session')
  collaboration!: CollaborationSession;

  @service('toast-handler')
  toast!: ToastHandlerService;

  private readonly debug = debugLogger('auto-join-lobby');

  constructor(owner: unknown, args: AutoJoinLobbyArgs) {
    super(owner, args);

    if (this.args.roomId) {
      this.autoJoinLobby();
    }
  }

  async autoJoinLobby(retries = 5) {
    if (this.collaboration.connectionStatus === 'online') {
      this.debug('Auto join lobby: Already connected. Aborting...');
      return;
    }
    const roomHosted = await this.collaboration.hostRoom(this.args.roomId);

    if (roomHosted) {
      this.debug('Successfully auto joined room');
    } else if (!roomHosted && retries <= 0) {
      this.debug('Failed to auto join room, no retries left');
      this.toast.showErrorToastMessage('Failed to join room automatically.');
    } else {
      this.debug('Failed to auto join room, retrying in 5 seconds again...');
      setTimeout(() => {
        this.autoJoinLobby(retries - 1);
      }, 5000);
    }
  }
}
