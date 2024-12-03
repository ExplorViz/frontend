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
import Auth from 'explorviz-frontend/services/auth';
import LandscapeTokenService, {
  LandscapeToken,
} from 'explorviz-frontend/services/landscape-token';
import LinkRenderer from 'explorviz-frontend/services/link-renderer';
import ApplicationRepository from 'explorviz-frontend/services/repos/application-repository';
import SpectateConfigurationService, {
  SpectateConfig,
} from 'explorviz-frontend/services/spectate-configuration';
import ToastHandlerService from 'explorviz-frontend/services/toast-handler';
import UserSettings from 'explorviz-frontend/services/user-settings';
import ChatService from 'explorviz-frontend/services/chat';

export default class CollaborationControls extends Component {
  @service('auth')
  private auth!: Auth;

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

  @service('spectate-configuration')
  spectateConfigurationService!: SpectateConfigurationService;

  @tracked
  rooms: RoomListRecord[] = [];

  @tracked
  deviceId = new URLSearchParams(window.location.search).get('deviceId');

  @tracked
  landscapeTokens: LandscapeToken[] = [];

  @tracked
  mutedUsers: string[] = [];

  @tracked
  spectateConfigEnabled: boolean = false;

  @tracked
  spectateConfigs: SpectateConfig[] = [];

  @tracked
  configDevices: string[] = [];

  @tracked
  selectedConfig: SpectateConfig | null = null;

  @tracked
  selectedDevice: string | null = null;

  @tracked
  spectateConfigModal: boolean = false;

  @tracked
  editSpectateConfigModal: boolean = false;

  @tracked
  createSpectateConfigBtnDisabled: boolean = true;

  @tracked
  spectateConfigName: string | null = null;

  @tracked
  spectateConfigDevices: { deviceId: string; projectionMatrix: number[] }[] =
    [];

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
        style: `color:#${user.color.getHexString()}`,
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

  constructor(owner: any, args: any) {
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

    this.spectateConfigs =
      await this.spectateConfigurationService.retrieveConfigs();
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
      } else {
        this.mutedUsers = [...this.mutedUsers, userId];
      }
      this.chatService.toggleMuteStatus(userId);
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
  configurationSelected(selectedConfig: string) {
    if (!selectedConfig) return;

    const remoteUserIds = Array.from(
      this.collaborationSession.getAllRemoteUsers()
    ).map((user) => user.userId);
    this.spectateUserService.activateConfig(selectedConfig, remoteUserIds);
  }

  @action
  sendSelectedConfiguration() {
    if (this.selectedDevice !== 'main') {
      this.toastHandlerService.showErrorToastMessage(
        'Applying spectate configurations only possible as device `main`.'
      );
    } else {
      this.configurationSelected(this.selectedConfig!.id);
    }
  }

  @action
  updateSelectedConfig(config: SpectateConfig) {
    this.configDevices = [];
    this.selectedDevice = null;

    const selectedToken = new URLSearchParams(window.location.search).get(
      'landscapeToken'
    );

    this.router.transitionTo('visualization', {
      queryParams: {
        landscapeToken: selectedToken,
        deviceId: 'default',
      },
    });

    this.selectedConfig = config;

    this.selectedConfig.devices.forEach((device) => {
      this.configDevices = [...this.configDevices, device.deviceId];
    });
  }

  @action
  updateSelectedDevice(device: string) {
    this.selectedDevice = device;

    const selectedToken = new URLSearchParams(window.location.search).get(
      'landscapeToken'
    );

    this.router.transitionTo('visualization', {
      queryParams: {
        landscapeToken: selectedToken,
        deviceId: this.selectedDevice,
      },
    });
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
  openSpectateConfigModal() {
    this.spectateConfigModal = true;
  }

  @action
  closeSpectateConfigModal() {
    this.spectateConfigModal = false;
    this.spectateConfigDevices = [];
    this.createSpectateConfigBtnDisabled = true;
    this.spectateConfigName = null;
  }

  @action
  updateName(event: InputEvent) {
    const target: HTMLInputElement = event.target as HTMLInputElement;
    this.spectateConfigName = target.value;
    this.canCreateSpectateConfig();
  }

  @action
  createDevice() {
    if (this.spectateConfigDevices.length === 0) {
      this.spectateConfigDevices = [
        ...this.spectateConfigDevices,
        {
          deviceId: 'main',
          projectionMatrix: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
      ];
    } else {
      this.spectateConfigDevices = [
        ...this.spectateConfigDevices,
        {
          deviceId: '',
          projectionMatrix: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
      ];
    }
  }

  @action
  updateDeviceId(index: number, event: Event) {
    const target = event.target as HTMLInputElement;
    this.spectateConfigDevices[index].deviceId = target.value;
    this.canCreateSpectateConfig();
  }

  @action
  updateMatrix(index: number, matrixIndex: number, event: Event) {
    const target = event.target as HTMLInputElement;
    this.spectateConfigDevices[index].projectionMatrix[matrixIndex] = Number(
      target.value
    );
    this.canCreateSpectateConfig();
  }

  @action
  getMatrixEntry(index: number, matrixIndex: number) {
    return this.spectateConfigDevices[index].projectionMatrix[matrixIndex];
  }

  @action
  deleteDevice(index: number) {
    this.spectateConfigDevices.removeAt(index);
    this.canCreateSpectateConfig();
  }

  @action
  canCreateSpectateConfig() {
    if (this.spectateConfigName !== '') {
      let allSet = true;
      this.spectateConfigDevices.forEach((dv) => {
        if (dv.deviceId === '') {
          allSet = false;
        }
      });

      if (allSet) {
        this.createSpectateConfigBtnDisabled = false;
      }
    } else {
      this.createSpectateConfigBtnDisabled = false;
    }
  }

  @action
  async createSpectateConfig() {
    const spectateConfig = {
      id: this.spectateConfigName!,
      user: this.auth.user!.sub,
      devices: this.spectateConfigDevices,
    };

    await this.spectateConfigurationService.saveSpectateConfig(spectateConfig);

    this.spectateConfigs =
      await this.spectateConfigurationService.retrieveConfigs();

    this.closeSpectateConfigModal();
  }

  @action
  openEditSpectateConfigModal() {
    if (this.selectedConfig === null) {
      this.toastHandlerService.showErrorToastMessage(
        'Select a configuration to edit.'
      );
      return;
    }

    if (this.selectedConfig.user !== this.auth.user?.sub) {
      this.toastHandlerService.showErrorToastMessage(
        'You are not the creator of the configuration.'
      );
      return;
    }

    this.editSpectateConfigModal = true;

    this.spectateConfigName = this.selectedConfig!.id;
    this.spectateConfigDevices = this.selectedConfig!.devices;
  }

  @action
  closeEditSpectateConfigModal() {
    this.editSpectateConfigModal = false;
    this.spectateConfigDevices = [];
    this.createSpectateConfigBtnDisabled = true;
    this.spectateConfigName = null;
  }

  @action
  async updateSpectateConfig() {
    const spectateConfig = {
      id: this.spectateConfigName!,
      user: this.auth.user!.sub,
      devices: this.spectateConfigDevices,
    };

    await this.spectateConfigurationService.updateSpectateConfig(
      spectateConfig
    );

    this.spectateConfigs =
      await this.spectateConfigurationService.retrieveConfigs();

    this.reassignSelectedItems();

    this.closeEditSpectateConfigModal();
  }

  @action
  async deleteSpectateConfig() {
    const spectateConfig = {
      id: this.spectateConfigName!,
      user: this.auth.user!.sub,
      devices: this.spectateConfigDevices,
    };

    await this.spectateConfigurationService.deleteSpectateConfig(
      spectateConfig
    );

    this.spectateConfigs =
      await this.spectateConfigurationService.retrieveConfigs();

    this.reassignSelectedItems();

    this.closeEditSpectateConfigModal();
  }

  // To update the selected item in PowerSelect
  @action
  reassignSelectedItems() {
    const oldConfig = this.selectedConfig;

    this.selectedConfig = null;
    this.selectedDevice = null;
    this.configDevices = [];

    let configStillExists = false;
    let newConfig = null;

    this.spectateConfigs.forEach((sc) => {
      if (sc.id === oldConfig!.id) {
        configStillExists = true;
        newConfig = sc;
      }
    });

    if (configStillExists) {
      this.selectedConfig = newConfig;

      this.selectedConfig!.devices.forEach((device) => {
        this.configDevices = [...this.configDevices, device.deviceId];
      });
    }

    const selectedToken = new URLSearchParams(window.location.search).get(
      'landscapeToken'
    );

    this.router.transitionTo('visualization', {
      queryParams: {
        landscapeToken: selectedToken,
        deviceId: 'default',
      },
    });
  }
}
