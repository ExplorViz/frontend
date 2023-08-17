import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import Auth from 'explorviz-frontend/services/auth';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import SynchronizeService from 'virtual-reality/services/synchronize';
import SynchronizationSession from 'collaborative-mode/services/synchronization-session';
import CollaborationSession from 'collaborative-mode/services/collaboration-session';
import LandscapeTokenService, {
  LandscapeToken,
} from 'explorviz-frontend/services/landscape-token';
import { timeout } from 'ember-concurrency';
import VrRoomService from 'virtual-reality/services/vr-room';
import AlertifyHandler from 'explorviz-frontend/utils/alertify-handler';
import { RoomListRecord } from 'virtual-reality/utils/vr-payload/receivable/room-list';

/**
 * TODO
 *
 * @class Application-Controller
 * @extends Ember.Controller
 *
 * @module explorviz
 * @submodule page
 */
export default class ApplicationController extends Controller {
  @service('auth') auth!: Auth;

  @service('synchronization-session')
  synchronizationSession!: SynchronizationSession;

  @service('collaboration-session')
  collaborationSession!: CollaborationSession;

  @service('landscape-token')
  tokenService!: LandscapeTokenService;

  @service('router')
  router!: any;

  @service('vr-room')
  roomService!: VrRoomService;

  @service('synchronize')
  synchronizeService!: SynchronizeService;

  private rooms: RoomListRecord[] = [];

  @tracked
  queryParams = ['deviceId', 'roomId'];
  @tracked
  deviceId = -99;
  @tracked
  roomId = '';

  exampleToken = {
    alias: 'Fibonacci Sample',
    created: 1551631224242,
    ownerId: 'github|123456',
    sharedUsersIds: [],
    value: '17844195-6144-4254-a17b-0f7fb49adb0a',
  };

  @action
  async updateSynchronization() {
    // Only trigger when query params set up
    if (this.roomId != '') {
      if (this.deviceId != -99) {
        this.synchronizationSession.setUpIds(this.deviceId, this.roomId);
      }

      this.setTokenTransition(this.exampleToken);

      await timeout(3000);

      this.rooms = await this.roomService.listRooms();
      console.log(this.rooms);

      const roomExists = this.rooms
        .map((r) => r.roomId)
        .includes(this.synchronizationSession.roomId);

      await timeout(3000);

      if (!roomExists) {
        try {
          const response = await this.roomService.createRoom();
          await this.collaborationSession.joinRoom(response.roomId, {
            checkConnectionStatus: false,
          });
        } catch (e: any) {
          AlertifyHandler.showAlertifyError(
            'Cannot reach Collaboration-Service.'
          );
        }
      } else {
        await this.collaborationSession.joinRoom(this.roomId, {
          checkConnectionStatus: false,
        });
      }

      Array.from(this.collaborationSession.getAllRemoteUsers()).map((user) => {
        if (user.color.getHexString() === 'ff0000') {
          this.synchronizeService.activate(user);
        }
      });
    }
  }

  @action
  setTokenTransition(token: LandscapeToken) {
    this.tokenService.setToken(token);
    this.router.transitionTo('visualization');
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your controllers.
declare module '@ember/controller' {
  // tslint:disable-next-line: interface-name
  interface Registry {
    applicationController: ApplicationController;
  }
}
