import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import CollaborationSession from 'collaborative-mode/services/collaboration-session';
import LandscapeTokenService, {
  LandscapeToken,
} from 'explorviz-frontend/services/landscape-token';
import SynchronizationSession from 'collaborative-mode/services/synchronization-session';
import { task, timeout } from 'ember-concurrency';
import VrRoomService from 'virtual-reality/services/vr-room';

interface SynchronizationCheckArgs {
  lsToken: string;
  deviceId: number;
  roomId: string;
}

export default class SynchronizationCheck extends Component<SynchronizationCheckArgs> {
  @service('collaboration-session')
  collaborationSession!: CollaborationSession;

  @service('router')
  router!: any;

  @service('landscape-token')
  tokenService!: LandscapeTokenService;

  @service('synchronization-session')
  private synchronizationSession!: SynchronizationSession;

  @service('vr-room')
  private roomService!: VrRoomService;

  token = {
    alias: 'Fibonacci Sample',
    created: 1551631224242,
    ownerId: 'github|123456',
    sharedUsersIds: [],
    value: '17844195-6144-4254-a17b-0f7fb49adb0a',
  };

  async routeToVisualization(token: LandscapeToken) {
    this.tokenService.setToken(token);
    await this.router.transitionTo('visualization');
  }

  setUpSynchronizationTask = task(async () => {
    this.synchronizationSession.setUp(this.args.roomId, this.args.deviceId);
    await this.routeToVisualization(this.token);
    // await timeout(1000);
    await this.roomService.createRoom();
  });

  get setUpSynchronization() {
    return () => {
      this.setUpSynchronizationTask.perform();
    };
  }
}
