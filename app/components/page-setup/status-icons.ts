import { inject as service } from '@ember/service';
import Component from '@glimmer/component';
import CollaborationSession from 'collaboration/services/collaboration-session';
import SpectateUser from 'collaboration/services/spectate-user';
import Configuration from 'explorviz-frontend/services/configuration';

export default class StatusIcons extends Component {
  @service('collaboration-session')
  collaboration!: CollaborationSession;

  @service('configuration')
  configuration!: Configuration;

  @service('spectate-user')
  spectate!: SpectateUser;

  get isOnline() {
    return this.collaboration.isOnline;
  }

  get isSpectating() {
    return this.spectate.spectatedUser !== null;
  }

  get isCommunicationHidden() {
    return !this.configuration.isCommRendered;
  }

  get users() {
    return this.collaboration.userCount;
  }
}
