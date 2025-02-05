import { inject as service } from '@ember/service';
import Component from '@glimmer/component';
import CollaborationSession from 'explorviz-frontend/services/collaboration/collaboration-session';
import SpectateUser from 'explorviz-frontend/services/collaboration/spectate-user';
import Configuration from 'explorviz-frontend/services/configuration';

export default class StatusIcons extends Component {
  @service('collaboration/collaboration-session')
  collaboration!: CollaborationSession;

  @service('configuration')
  configuration!: Configuration;

  @service('collaboration/spectate-user')
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

  get isSemanticZoomEnabled() {
    return this.configuration.semanticZoomEnabled;
  }

  get users() {
    return this.collaboration.userCount;
  }
}
