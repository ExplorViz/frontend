import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import CollaborationSession from 'collaborative-mode/services/collaboration-session';
import LandscapeTokenService, {
  LandscapeToken,
} from 'explorviz-frontend/services/landscape-token';
import SynchronizationSession from 'collaborative-mode/services/synchronization-session';
import { task, timeout } from 'ember-concurrency';

interface SynchronizationStartArgs {
  deviceId: number;
  roomId: string;
}

export default class SynchronizationStart extends Component<SynchronizationStartArgs> {
  @service('collaboration-session')
  collaborationSession!: CollaborationSession;

  @service('router')
  router!: any;

  @service('landscape-token')
  tokenService!: LandscapeTokenService;

  @service('synchronization-session')
  synchronizationSession!: SynchronizationSession;

  token = {
    alias: 'Fibonacci Sample',
    created: 1551631224242,
    ownerId: 'github|123456',
    sharedUsersIds: [],
    value: '17844195-6144-4254-a17b-0f7fb49adb0a',
  };

  // Check for updates on query params
  checkQueryParams() {
    return this.args.deviceId > -1 && this.args.roomId !== '';
  }

  // Create task to handle async calls on room handling
  setUpSynchronizationTask = task(async () => {
    // Set up service attributes
    this.synchronizationSession.setUp(this.args.roomId, this.args.deviceId);
    // set token and redirect to visualization space
    this.routeToVisualization(this.token);

    // chill to let all be set up
    await timeout(10000);

    // host room if main-instance, join room if projector
    this.synchronizationSession.deviceId == 0
      ? await this.collaborationSession.hostRoom()
      : await this.collaborationSession.joinRoom(
          this.synchronizationSession.roomId!
        );
  });

  routeToVisualization(token: LandscapeToken) {
    this.tokenService.setToken(token);
    this.router.transitionTo('visualization');
  }

  // Function which is called when query params are set and the component is created
  get setUpSynchronization() {
    return () => {
      this.checkQueryParams() && this.setUpSynchronizationTask.perform();
    };
  }
}
