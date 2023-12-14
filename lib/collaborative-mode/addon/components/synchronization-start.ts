import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import CollaborationSession from 'collaborative-mode/services/collaboration-session';
import LandscapeTokenService, {
  LandscapeToken,
} from 'explorviz-frontend/services/landscape-token';
import SynchronizationSession from 'collaborative-mode/services/synchronization-session';
import { task, timeout } from 'ember-concurrency';
import ProjectorSynchronization from 'collaborative-mode/services/projector-synchronization';
interface SynchronizationStartArgs {
  deviceId: string;
  roomId: string;
  tokenId: string;
}

/**
 * Heart of the automatic initiation of the synchronization feature.
 * Effectivly setting up SychronizationSession and providing access to
 * projector identification and specific collaboration session via query parameter.
 */
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
  private synchronizeService!: ProjectorSynchronization;

  token = {
    alias: 'Query parameterized landscape name',
    created: 1551631224242,
    ownerId: 'github|123456',
    sharedUsersIds: [],
    value: this.args.tokenId,
  };

  // Check for updates on query params
  checkQueryParams() {
    return (
      this.args.deviceId !== '' &&
      this.args.roomId !== '' &&
      this.args.tokenId !== ''
    );
  }

  async routeToVisualization(token: LandscapeToken) {
    this.tokenService.setToken(token);
    this.router.transitionTo('visualization');
  }

  async synchronizeTask() {
    // chill to let all be set up
    await timeout(2000);

    Array.from(this.collaborationSession.getAllRemoteUsers()).map((user) => {
      if (user.userName == 'Main') {
        this.synchronizeService.activate(user);
      }
    });
  }

  // Create task to handle async calls on room handling
  setUpSynchronizationTask = task(async () => {
    // Set up service attributes
    this.synchronizationSession.setUpIds(this.args.deviceId, this.args.roomId);

    // set token and redirect to visualization space
    await this.routeToVisualization(this.token);
    // handle room situation
    // await this.roomTask();
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

  // Clean up
  willDestroy(): void {
    super.willDestroy();
    this.synchronizationSession.destroyIds();
  }
}
