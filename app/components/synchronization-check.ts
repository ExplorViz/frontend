import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import CollaborationSession from 'collaborative-mode/services/collaboration-session';
import LandscapeTokenService, {
  LandscapeToken,
} from 'explorviz-frontend/services/landscape-token';

interface SynchronizationCheckArgs {
  lsToken: string;
}

export default class SynchronizationCheck extends Component<SynchronizationCheckArgs> {
  @service('collaboration-session')
  collaborationSession!: CollaborationSession;

  @service('router')
  router!: any;

  @service('landscape-token')
  tokenService!: LandscapeTokenService;

  token = {
    alias: 'Fibonacci Sample',
    created: 1551631224242,
    ownerId: 'github|123456',
    sharedUsersIds: [],
    value: '17844195-6144-4254-a17b-0f7fb49adb0a',
  };

  get startSynchronization() {
    return () => {
      this.collaborationSession.hostRoom();
      this.routeToVisualization(this.token);
    };
  }

  routeToVisualization(token: LandscapeToken) {
    this.tokenService.setToken(token);
    this.router.transitionTo('visualization');
  }
}
