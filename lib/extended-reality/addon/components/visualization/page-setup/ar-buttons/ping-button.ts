import { computed } from '@ember/object';
import { inject as service } from '@ember/service';
import Component from '@glimmer/component';
import CollaborationSession from 'collaboration/services/collaboration-session';
import HighlightingService from 'explorviz-frontend/services/highlighting-service';

interface PingButtonArgs {
  handlePing(): void;
}

export default class PingButton extends Component<PingButtonArgs> {
  @service('highlighting-service')
  highlightingService!: HighlightingService;

  @service('collaboration-session')
  collaborationSession!: CollaborationSession;

  @computed('collaborationSession.idToRemoteUser')
  get userIsAlone() {
    const numberOfOtherUsers = Array.from(
      this.collaborationSession.getAllRemoteUsers()
    ).length;

    return numberOfOtherUsers === 0;
  }
}
