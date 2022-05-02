import { computed } from '@ember/object';
import { inject as service } from '@ember/service';
import Component from '@glimmer/component';
import CollaborationSession from 'collaborative-mode/services/collaboration-session';
import HighlightingService from 'explorviz-frontend/services/highlighting-service';
import RemoteVrUserService from 'virtual-reality/services/remote-vr-users';

interface PingButtonArgs {
  handlePing(): void
}

export default class PingButton extends Component<PingButtonArgs> {

  @service('highlighting-service')
  highlightingService!: HighlightingService;

  @service('remote-vr-users')
  // @ts-ignore since it is used in template
  private remoteUsers!: RemoteVrUserService;

  @service('collaboration-session')
  collaborationSession!: CollaborationSession;

  @computed('remoteUsers.idToRemoteUser')
  get userIsAlone() {
    const numberOfOtherUsers = Array.from(this.collaborationSession.getAllRemoteUsers()).length;

    return numberOfOtherUsers === 0;
  }
}
