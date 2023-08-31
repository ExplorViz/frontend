import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import CollaborationSession from 'collaborative-mode/services/collaboration-session';
import LandscapeTokenService, {
  LandscapeToken,
} from 'explorviz-frontend/services/landscape-token';
import SynchronizationSession from 'collaborative-mode/services/synchronization-session';
import { task, timeout } from 'ember-concurrency';
import SynchronizeService from 'virtual-reality/services/synchronizing';
import VrRoomService from 'virtual-reality/services/vr-room';
import { RoomListRecord } from 'virtual-reality/utils/vr-payload/receivable/room-list';
import { tracked } from '@glimmer/tracking';
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

  @service('vr-room')
  roomService!: VrRoomService;

  @tracked
  rooms: RoomListRecord[] = [];

  token = {
    alias: 'Fibonacci Sample',
    created: 1551631224242,
    ownerId: 'github|123456',
    sharedUsersIds: [],
    value: '17844195-6144-4254-a17b-0f7fb49adb0a',
  };

  // Check for updates on query params
  checkQueryParams() {
    return this.args.deviceId > -99 && this.args.roomId !== '';
  }

  async routeToVisualization(token: LandscapeToken) {
    this.tokenService.setToken(token);
    this.router.transitionTo('visualization');
  }

  async roomTask() {
    await timeout(3000);
    // Trigger synchronization when query param are saved in synchronization service
    await this.collaborationSession.hostRoom(
      this.args.deviceId == this.synchronizationSession.deviceId
    );
  }

  async synchronizeTask() {
    // chill to let all be set up
    await timeout(2000);

    // let mainfound = this.synchronizationSession.deviceId !== 0;

    // while (!mainfound) {
    Array.from(this.collaborationSession.getAllRemoteUsers()).map((user) => {
      if (user.userName == 'Main') {
        this.synchronizeService.activate(user);
        // mainfound = true;
      }
    });
    // }
  }

  // Create task to handle async calls on room handling
  setUpSynchronizationTask = task(async () => {
    // Set up service attributes
    this.synchronizationSession.setUpIds(this.args.deviceId, this.args.roomId);

    // set token and redirect to visualization space
    await this.routeToVisualization(this.token);
    // handle room situation
    await this.roomTask();
    // handle which instance is getting synchronized to which
    await this.synchronizeTask();
  });

  // Function which is called when query params are set and the component is created
  setUpSynchronization() {
    this.checkQueryParams() && this.setUpSynchronizationTask.perform();
  }

  // triggers when application.hbs implemented
  constructor(owner: unknown, args: SynchronizationStartArgs) {
    super(owner, args);

    this.setUpSynchronization();
  }

  willDestroy(): void {
    super.willDestroy();

    // Clean up?
  }
}
