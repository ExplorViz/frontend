import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import CollaborationSession from 'collaborative-mode/services/collaboration-session';
import LandscapeTokenService, {
  LandscapeToken,
} from 'explorviz-frontend/services/landscape-token';
import SynchronizationSession from 'collaborative-mode/services/synchronization-session';
import VrRoomService from 'virtual-reality/services/vr-room';

interface SynchronizationStartArgs {
  lsToken: string;
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

  @service('vr-room')
  private roomService!: VrRoomService;

  get startSynchronization() {
    return () => {
      this.hostRoom();
    };
  }

  async hostRoom() {
    const response = this.roomService.createRoom();
    console.log(response);
  }
}
