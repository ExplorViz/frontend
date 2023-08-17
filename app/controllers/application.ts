import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import Auth from 'explorviz-frontend/services/auth';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import SynchronizeService from 'virtual-reality/services/synchronize';
import SynchronizationSession from 'collaborative-mode/services/synchronization-session';
import CollaborationSession from 'collaborative-mode/services/collaboration-session';
import LandscapeTokenService from 'explorviz-frontend/services/landscape-token';
import { timeout } from 'ember-concurrency';
import VrRoomService from 'virtual-reality/services/vr-room';
import AlertifyHandler from 'explorviz-frontend/utils/alertify-handler';

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
  private tokenService!: LandscapeTokenService;

  @service('router')
  private router!: any;

  @service('vr-room')
  roomService!: VrRoomService;

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
    if (this.deviceId != -99 && this.roomId != '') {
      this.synchronizationSession.setUpIds(this.deviceId, this.roomId);
    }

    try {
      const response = await this.roomService.createRoom();
      console.log(response);
      // this.joinRoom(response.roomId, { checkConnectionStatus: false });
    } catch (e: any) {
      AlertifyHandler.showAlertifyError('Cannot reach Collaboration-Service.');
    }
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your controllers.
declare module '@ember/controller' {
  // tslint:disable-next-line: interface-name
  interface Registry {
    applicationController: ApplicationController;
  }
}
