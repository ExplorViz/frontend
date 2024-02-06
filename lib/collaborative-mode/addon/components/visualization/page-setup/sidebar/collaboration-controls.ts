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
import LandscapeTokenService from 'explorviz-frontend/services/landscape-token';

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

  @service('landscape-token')
  private tokenService!: LandscapeTokenService;

  @tracked
  rooms: RoomListRecord[] = [];

  @tracked
  deviceId = new URLSearchParams(window.location.search).get('deviceId');

  @computed(
    'collaborationSession.idToRemoteUser',
    'spectateUserService.spectatedUser'
  )
  get users() {
    const users = [];
    if (this.localUser.color) {
      users.push({
        name: `${this.localUser.userName} (you)`,
        style: `color:#${this.localUser.color.getHexString()}`,
        isSpectatable: false,
        isSpectatedByUs: false,
      });
    }
    const remoteUsers = Array.from(
      this.collaborationSession.getAllRemoteUsers()
    ).map((user) => {
      const isSpectatedByUs =
        this.spectateUserService.spectatedUser?.userId === user.userId;
      return {
        remoteUserId: user.userId,
        name: user.userName,
        style: `color:#${user.color.getHexString()}`,
        isSpectatedByUs: isSpectatedByUs,
        isSpectatable: true,
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
  async joinRoom(room: RoomListRecord) {
    if (this.tokenService.token?.value === room.landscapeToken) {
      this.collaborationSession.joinRoom(room.roomId);
      AlertifyHandler.showAlertifySuccess(`Join Room: ${room.roomName}`);
    } else {
      const tokens = await this.tokenService.retrieveTokens();
      const token = tokens.find((elem) => elem.value == room.landscapeToken);
      if (token) {
        this.tokenService.setToken(token);
        this.collaborationSession.joinRoom(room.roomId);
        AlertifyHandler.showAlertifySuccess(`Join Room: ${room.roomName}`);
      } else {
        AlertifyHandler.showAlertifyError(`Landscape token for room not found`);
      }
    }
  }

  @action
  toggleSpectate(user: { remoteUserId: string; isSpectatedByUs: boolean }) {
    const remoteUser = this.collaborationSession.lookupRemoteUserById(
      user.remoteUserId
    );
    if (remoteUser && !user.isSpectatedByUs) {
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
