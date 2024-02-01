import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { LandscapeToken } from 'explorviz-frontend/services/landscape-token';
import VrRoomService from 'virtual-reality/services/vr-room';
import { RoomListRecord } from 'virtual-reality/utils/vr-payload/receivable/room-list';
import ToastHandlerService from 'explorviz-frontend/services/toast-handler';
import CollaborationSession from 'collaborative-mode/services/collaboration-session';

interface RoomListArgs {
  tokens: LandscapeToken[];
  selectToken(token: LandscapeToken): void;
}

export default class RoomList extends Component<RoomListArgs> {
  @service('vr-room')
  roomService!: VrRoomService;

  @service('collaboration-session')
  private collaborationSession!: CollaborationSession;

  @service('toastHandler')
  toastHandlerService!: ToastHandlerService;

  @tracked
  rooms: RoomListRecord[] = [];

  constructor(owner: any, args: RoomListArgs) {
    super(owner, args);

    this.loadRooms(false);
  }

  @action
  async loadRooms(alert = true) {
    if (alert) {
      this.toastHandlerService.showSuccessToastMessage('Reloading Rooms');
    }
    const rooms = await this.roomService.listRooms();
    rooms.forEach((room) => {
      room.alias = this.args.tokens.findBy('value', room.landscapeToken)?.alias;
    });
    this.rooms = rooms.filter(
      (room) =>
        this.args.tokens.findBy('value', room.landscapeToken) !== undefined
    );
  }

  @action
  joinRoom(room: RoomListRecord) {
    const token = this.args.tokens.findBy('value', room.landscapeToken);
    if (token) {
      this.args.selectToken(token);
      this.collaborationSession.joinRoom(room.roomId);
    }
  }
}
