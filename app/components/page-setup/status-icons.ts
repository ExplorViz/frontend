import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import CollaborationSession from 'collaboration/services/collaboration-session';
import SpectateUser from 'collaboration/services/spectate-user';

export default class StatusIcons extends Component {
  @service('collaboration-session')
  collaboration!: CollaborationSession;

  @service('spectate-user')
  spectate!: SpectateUser;

  get isOnline() {
    return this.collaboration.isOnline;
  }

  get isSpectating() {
    return this.spectate.spectatedUser !== null;
  }

  get users() {
    return this.collaboration.userCount;
  }
}
