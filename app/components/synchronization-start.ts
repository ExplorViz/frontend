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
  private synchronizationSession!: SynchronizationSession;

  token = {
    alias: 'Fibonacci Sample',
    created: 1551631224242,
    ownerId: 'github|123456',
    sharedUsersIds: [],
    value: '17844195-6144-4254-a17b-0f7fb49adb0a',
  };

  setUpSynchronizationTask = task(async () => {
    this.synchronizationSession.setUp(this.args.roomId, this.args.deviceId);
    this.routeToVisualization(this.token);
    await timeout(10000);
    this.synchronizationSession.deviceId == 0
      ? this.collaborationSession.hostRoom()
      : this.collaborationSession.joinRoom(this.synchronizationSession.roomId!);
  });

  routeToVisualization(token: LandscapeToken) {
    this.tokenService.setToken(token);
    this.router.transitionTo('visualization');
  }

  get setUpSynchronization() {
    return () => {
      this.setUpSynchronizationTask.perform();
    };
  }
}
