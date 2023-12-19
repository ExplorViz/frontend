import Component from '@glimmer/component';
import { action, computed } from '@ember/object';
import { inject as service } from '@ember/service';
import VrRoomService from 'virtual-reality/services/vr-room';
import AlertifyHandler from 'explorviz-frontend/utils/alertify-handler';
import { tracked } from '@glimmer/tracking';
import { RoomListRecord } from 'virtual-reality/utils/vr-payload/receivable/room-list';
import CollaborationSession from 'collaborative-mode/services/collaboration-session';
import LocalUser from 'collaborative-mode/services/local-user';
import SpectateUser from 'collaborative-mode/services/spectate-user';

interface CollaborationArgs {
  removeComponent(componentPath: string): void;
}

export default class CollaborationControls extends Component<CollaborationArgs> {
  @service('local-user')
  localUser!: LocalUser;

  @service('vr-room')
  roomService!: VrRoomService;

  @service('timestamp')
  // @ts-ignore since it is used in template
  private timestampService!: TimestampService;

  @service('collaboration-session')
  private collaborationSession!: CollaborationSession;
  @service('spectate-user')
  private spectateUserService!: SpectateUser;

  @tracked
  rooms: RoomListRecord[] = [];

  @tracked
  deviceId = new URLSearchParams(window.location.search).get('deviceId');

  @computed('collaborationSession.idToRemoteUser')
  get users() {
    const users = [];
    if (this.localUser.color) {
      users.push({
        name: `${this.localUser.userName} (you)`,
        style: `color:#${this.localUser.color.getHexString()}`,
      });
    }
    const remoteUsers = Array.from(
      this.collaborationSession.getAllRemoteUsers()
    ).map((user) => {
      return {
        name: user.userName,
        style: `color:#${user.color.getHexString()}`,
        id: user.userId,
      };
    });

    return users.concat(remoteUsers);
  }

  constructor(owner: any, args: CollaborationArgs) {
    super(owner, args);

    this.loadRooms(false);
  }

  @action
  hostRoom() {
    this.collaborationSession.hostRoom();
    AlertifyHandler.showAlertifySuccess('Hosting new Room.');
  }

  @action
  leaveSession() {
    AlertifyHandler.showAlertifyWarning('Disconnected from Room');
    this.collaborationSession.disconnect();
  }

  @action
  async loadRooms(alert = true) {
    if (alert) {
      AlertifyHandler.showAlertifySuccess('Reloading Rooms');
    }
    const rooms = await this.roomService.listRooms();
    this.rooms = rooms;
  }

  @action
  joinRoom(room: RoomListRecord) {
    AlertifyHandler.showAlertifySuccess(`Join Room: ${room.roomName}`);
    this.collaborationSession.joinRoom(room.roomId);
  }

  @action
  spectate(id: string) {
    const remoteUser = this.collaborationSession.lookupRemoteUserById(id);
    if (remoteUser) {
      this.spectateUserService.activate(remoteUser);
    } else {
      this.spectateUserService.deactivate();
    }
  }

  @action
  configurationSelected(event: any) {
    if (!event.target.value) return;

    const remoteUserIds = Array.from(
      this.collaborationSession.getAllRemoteUsers()
    ).map((user) => user.userId);
    this.spectateUserService.activateConfig(event?.target.value, remoteUserIds);
  }

  @action
  close() {
    this.args.removeComponent('collaboration-controls');
  }
}
