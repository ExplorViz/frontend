import { action, computed } from '@ember/object';
import { inject as service } from '@ember/service';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import CollaborationSession from 'collaboration/services/collaboration-session';
import LocalUser from 'collaboration/services/local-user';
import MessageSender from 'collaboration/services/message-sender';
import RoomService from 'collaboration/services/room-service';
import SpectateUser from 'collaboration/services/spectate-user';
import { RoomListRecord } from 'collaboration/utils/room-payload/receivable/room-list';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';
import LandscapeTokenService, {
  LandscapeToken,
} from 'explorviz-frontend/services/landscape-token';
import LinkRenderer from 'explorviz-frontend/services/link-renderer';
import ApplicationRepository from 'explorviz-frontend/services/repos/application-repository';
import ToastHandlerService from 'explorviz-frontend/services/toast-handler';
import UserSettings from 'explorviz-frontend/services/user-settings';
import ChatService from 'explorviz-frontend/services/chat';

interface CollaborationArgs {
  removeComponent(componentPath: string): void;
}

export default class CollaborationControls extends Component<CollaborationArgs> {
  @service('application-renderer')
  applicationRenderer!: ApplicationRenderer;

  @service('repos/application-repository')
  applicationRepo!: ApplicationRepository;

  @service('collaboration-session')
  private collaborationSession!: CollaborationSession;

  @service('landscape-token')
  private tokenService!: LandscapeTokenService;

  @service('link-renderer')
  private linkRenderer!: LinkRenderer;

  @service('local-user')
  localUser!: LocalUser;

  @service('message-sender')
  private sender!: MessageSender;

  @service('room-service')
  roomService!: RoomService;

  @service('router')
  router!: any;

  @service('chat')
  chatService!: ChatService;

  @service('spectate-user')
  private spectateUserService!: SpectateUser;

  @service('timestamp')
  // @ts-ignore since it is used in template
  private timestampService!: TimestampService;

  @service('toast-handler')
  toastHandlerService!: ToastHandlerService;

  @service('user-settings')
  userSettings!: UserSettings;

  @tracked
  rooms: RoomListRecord[] = [];

  @tracked
  deviceId = new URLSearchParams(window.location.search).get('deviceId');

  @tracked
  landscapeTokens: LandscapeToken[] = [];

  @tracked mutedUsers: string[] = [];

  @computed(
    'collaborationSession.idToRemoteUser',
    'spectateUserService.spectatedUser'
  )
  get users() {
    const users = [];
    if (this.localUser.color) {
      users.push({
        name: `${this.localUser.userName} (you)`,
        style: `color: ${this.localUser.color.getStyle()}`,
        isLocalUser: true,
        isSpectatable: false,
        isSpectatedByUs: false,
        isMuteable: false,
        isMuted: false,
        isKickable: false,
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
        style: `color: ${user.color.getStyle()}`,
        isLocalUser: false,
        isSpectatedByUs: isSpectatedByUs,
        isSpectatable: true,
        isMuteable: this.localUser.isHost,
        isMuted: false,
        isKickable: this.localUser.isHost,
      };
    });

    return users.concat(remoteUsers);
  }

  constructor(owner: any, args: CollaborationArgs) {
    super(owner, args);

    this.mutedUsers = this.chatService.userIdMuteList || [];
    this.loadRooms(false);
  }

  @action
  hostRoom() {
    this.collaborationSession.hostRoom();
    this.toastHandlerService.showSuccessToastMessage('Hosting new Room.');
  }

  @action
  leaveSession() {
    this.toastHandlerService.showInfoToastMessage('Disconnected from Room');
    this.collaborationSession.disconnect();
  }

  @action
  async loadRooms(alert = true) {
    if (alert) {
      this.toastHandlerService.showSuccessToastMessage('Reloading Rooms');
    }
    const rooms = await this.roomService.listRooms();
    this.rooms = rooms;
    this.landscapeTokens = await this.tokenService.retrieveTokens();
  }

  @action
  async joinRoom(room: RoomListRecord) {
    // In case join action fails, the room list should be up-to-date
    this.loadRooms(false);

    this.collaborationSession.joinRoom(room.roomId);
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
  shareSettings() {
    this.userSettings.shareApplicationSettings();
  }

  @action
  toggleMuteStatus(user: { remoteUserId: string }) {
    if (user) {
      const userId = user.remoteUserId;

      if (this.chatService.isUserMuted(userId)) {
        this.mutedUsers = this.mutedUsers.filter((id) => id !== userId);
        this.chatService.unmuteUser(userId);
      } else {
        this.mutedUsers = [...this.mutedUsers, userId];
        this.chatService.muteUser(userId);
      }
    }
  }

  @action
  isUserMuted(user: { remoteUserId: string }) {
    if (!user) {
      return;
    }
    return this.mutedUsers.includes(user.remoteUserId);
  }

  @action
  kickUser(user: { remoteUserId: string }) {
    if (!user) {
      return;
    }
    this.sender.sendKickUser(user.remoteUserId);
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
  landscapeSelected(event: any) {
    this.tokenService.setTokenByValue(event.target.value);

    // Cleanup old landscape
    this.applicationRenderer.cleanup();
    this.applicationRepo.cleanup();
    this.linkRenderer.getAllLinks().forEach((externLink) => {
      externLink.removeFromParent();
    });

    // this.tokenService.setToken(event.target.value);
    this.router.transitionTo('visualization', {
      queryParams: {
        landscapeToken: event.target.value,
        deviceId: this.deviceId,
      },
    });
    this.sender.sendChangeLandscape(event.target.value);
    this.sender.sendChatMessage(
      this.localUser.userId,
      `${this.localUser.userName}(${this.localUser.userId}) changed the landscape`,
      this.localUser.userName,
      '',
      true,
      'landscape_change',
      []
    );
  }

  @action
  close() {
    this.args.removeComponent('collaboration-controls');
  }
}
