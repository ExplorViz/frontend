import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { LandscapeToken } from 'explorviz-frontend/services/landscape-token';
import AlertifyHandler from 'explorviz-frontend/utils/alertify-handler';
import CollaborationSession from 'collaboration/services/collaboration-session';
import RoomService from 'collaboration/services/room-service';
import { RoomListRecord } from 'collaboration/utils/room-payload/receivable/room-list';

interface RoomListArgs {
  tokens: LandscapeToken[];
  selectToken(token: LandscapeToken): void;
}

export default class RoomList extends Component<RoomListArgs> {
  @service('room-service')
  roomService!: RoomService;

  @service('collaboration-session')
  private collaborationSession!: CollaborationSession;

  @tracked
  rooms: RoomListRecord[] = [];

  constructor(owner: any, args: RoomListArgs) {
    super(owner, args);

    this.loadRooms(false);
  }

  @action
  async loadRooms(alert = true) {
    if (alert) {
      AlertifyHandler.showAlertifySuccess('Reloading Rooms');
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
