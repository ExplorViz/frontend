import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { LandscapeToken } from 'explorviz-frontend/services/landscape-token';
import ToastHandlerService from 'explorviz-frontend/services/toast-handler';
import CollaborationSession from 'explorviz-frontend/services/collaboration/collaboration-session';
import RoomService from 'explorviz-frontend/services/collaboration/room-service';
import { RoomListRecord } from 'explorviz-frontend/utils/collaboration/room-payload/receivable/room-list';

interface RoomListArgs {
  tokens: LandscapeToken[];
  selectToken(token: LandscapeToken): void;
}

export default class RoomList extends Component<RoomListArgs> {
  @service('collaboration/room-service')
  roomService!: RoomService;

  @service('collaboration/collaboration-session')
  private collaborationSession!: CollaborationSession;

  @service('toast-handler')
  toastHandlerService!: ToastHandlerService;

  @tracked
  rooms: RoomListRecord[] = [];

  constructor(owner: any, args: RoomListArgs) {
    super(owner, args);

    this.loadRooms(false);
  }

  @action
  async loadRooms(alert = true) {
    let rooms: RoomListRecord[] = [];
    try {
      rooms = await this.roomService.listRooms();
    } catch (error) {
      this.toastHandlerService.showErrorToastMessage('Could not load rooms');
      return;
    }

    rooms.forEach((room) => {
      room.alias = this.args.tokens.find(
        (elem) => elem.value == room.landscapeToken
      )?.alias;
    });
    this.rooms = rooms.filter(
      (room) =>
        this.args.tokens.find((elem) => elem.value == room.landscapeToken) !==
        undefined
    );

    if (alert) {
      this.toastHandlerService.showSuccessToastMessage('Updated room list');
    }
  }

  @action
  joinRoom(room: RoomListRecord) {
    this.collaborationSession.joinRoom(room.roomId);
  }
}
