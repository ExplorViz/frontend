import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import CollaborationSession from 'collaborative-mode/services/collaboration-session';
import LandscapeTokenService, {
  LandscapeToken,
} from 'explorviz-frontend/services/landscape-token';
import SynchronizationSession from 'collaborative-mode/services/synchronization-session';
import { task, timeout } from 'ember-concurrency';
import SynchronizeService from 'virtual-reality/services/synchronize';
import LocalUser from 'collaborative-mode/services/local-user';
import VrRoomService from 'virtual-reality/services/vr-room';

interface SynchronizationStartArgs {
  deviceId: number;
  roomId: string;
}

export default class SynchronizationStart extends Component<SynchronizationStartArgs> {
  @service('collaboration-session')
  private collaborationSession!: CollaborationSession;

  @service('router')
  private router!: any;

  @service('landscape-token')
  private tokenService!: LandscapeTokenService;

  @service('synchronization-session')
  private synchronizationSession!: SynchronizationSession;

  @service('synchronize')
  private synchronizeService!: SynchronizeService;

  @service('local-user')
  private localUser!: LocalUser;

  @service('vr-room')
  roomService!: VrRoomService;

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
    this.synchronizationSession.setUpIds(this.args.roomId, this.args.deviceId);
    // set token and redirect to visualization space
    this.routeToVisualization(this.token);

    await timeout(3000);
    // const rooms = await this.roomService.listRooms();
    // console.log(rooms);

    // host room if main-instance, join room if projector
    this.synchronizationSession.deviceId == 0
      ? this.collaborationSession.hostRoom()
      : this.collaborationSession.joinRoom(this.synchronizationSession.roomId!);

    // chill to let all be set up
    await timeout(2000);
    Array.from(this.collaborationSession.getAllRemoteUsers()).map((user) => {
      if (user.color.getHexString() === 'ff0000') {
        this.synchronizeService.activate(user);
      }
    });
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
