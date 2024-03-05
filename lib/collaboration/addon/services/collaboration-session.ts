import Service, { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import RemoteUser from 'collaboration/utils/remote-user';
import debugLogger from 'ember-debug-logger';
import HighlightingService from 'explorviz-frontend/services/highlighting-service';
import ToastHandlerService from 'explorviz-frontend/services/toast-handler';
import * as THREE from 'three';
import LocalUser from './local-user';
import UserFactory from './user-factory';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';
import { isEntityMesh } from 'extended-reality/utils/vr-helpers/detail-info-composer';
import UserSettings from 'explorviz-frontend/services/user-settings';
import LinkRenderer from 'explorviz-frontend/services/link-renderer';
import WebSocketService, { SELF_DISCONNECTED_EVENT } from './web-socket';
import RoomService from './room-service';
import {
  SELF_CONNECTED_EVENT,
  SelfConnectedMessage,
} from 'collaboration/utils/web-socket-messages/receivable/self-connected';
import {
  USER_CONNECTED_EVENT,
  UserConnectedMessage,
} from 'collaboration/utils/web-socket-messages/receivable/user-connected';
import {
  USER_DISCONNECTED_EVENT,
  UserDisconnectedMessage,
} from 'collaboration/utils/web-socket-messages/receivable/user-disconnect';
import {
  USER_POSITIONS_EVENT,
  UserPositionsMessage,
} from 'extended-reality/utils/vr-web-wocket-messages/sendable/user-positions';
import {
  CONTROLLER_1_ID,
  CONTROLLER_2_ID,
} from 'collaboration/utils/web-socket-messages/types/controller-id';
import { ForwardedMessage } from 'collaboration/utils/web-socket-messages/receivable/forwarded';
import LandscapeTokenService from 'explorviz-frontend/services/landscape-token';

export type ConnectionStatus = 'offline' | 'connecting' | 'online';

export default class CollaborationSession extends Service.extend({
  // anything which *must* be merged to prototype here
}) {
  debug = debugLogger('CollaborationSession');

  @service('web-socket')
  private webSocket!: WebSocketService;

  @service('room-service')
  private roomService!: RoomService;

  @service('local-user')
  private localUser!: LocalUser;

  @service('user-factory')
  private userFactory!: UserFactory;

  @service('highlighting-service')
  private highlightingService!: HighlightingService;

  @service('application-renderer')
  applicationRenderer!: ApplicationRenderer;

  @service('user-settings')
  private userSettings!: UserSettings;

  @service('link-renderer')
  linkRenderer!: LinkRenderer;

  @service('router')
  router!: any;

  @service('toast-handler')
  toastHandlerService!: ToastHandlerService;

  @service('landscape-token')
  tokenService!: LandscapeTokenService;

  @tracked
  idToRemoteUser: Map<string, RemoteUser> = new Map();

  readonly remoteUserGroup: THREE.Group = new THREE.Group();

  get userCount() {
    return this.idToRemoteUser.size + 1;
  }

  @tracked
  connectionStatus: ConnectionStatus = 'offline';

  @tracked
  currentRoomId: string | null = null;

  init() {
    super.init();
    this.debug('Initializing collaboration session');
    this.webSocket.on(SELF_CONNECTED_EVENT, this, this.onSelfConnected);
    this.webSocket.on(USER_CONNECTED_EVENT, this, this.onUserConnected);
    this.webSocket.on(USER_DISCONNECTED_EVENT, this, this.onUserDisconnect);
    this.webSocket.on(USER_POSITIONS_EVENT, this, this.onUserPositions);
    this.webSocket.on(SELF_DISCONNECTED_EVENT, this, this.onSelfDisconnected);
  }

  willDestroy() {
    this.webSocket.off(SELF_CONNECTED_EVENT, this, this.onSelfConnected);
    this.webSocket.off(USER_CONNECTED_EVENT, this, this.onUserConnected);
    this.webSocket.off(USER_DISCONNECTED_EVENT, this, this.onUserDisconnect);
    this.webSocket.off(USER_POSITIONS_EVENT, this, this.onUserPositions);
    this.webSocket.off(SELF_DISCONNECTED_EVENT, this, this.onSelfDisconnected);
  }

  addRemoteUser(remoteUser: RemoteUser) {
    // Make sure that the user does not already exist.
    if (this.idToRemoteUser.has(remoteUser.userId))
      this.removeRemoteUser(remoteUser);

    this.idToRemoteUser.set(remoteUser.userId, remoteUser);
    this.notifyPropertyChange('idToRemoteUser');
    this.remoteUserGroup.add(remoteUser);
  }

  removeRemoteUserById(userId: string): RemoteUser | undefined {
    const remoteUser = this.idToRemoteUser.get(userId);
    if (remoteUser) this.removeRemoteUser(remoteUser);
    return remoteUser;
  }

  private removeRemoteUser(remoteUser: RemoteUser) {
    // Remove user's 3d-objects.
    remoteUser.removeAllObjects3D();
    this.remoteUserGroup.remove(remoteUser);
    this.idToRemoteUser.delete(remoteUser.userId);
    this.notifyPropertyChange('idToRemoteUser');
  }

  removeAllRemoteUsers() {
    this.idToRemoteUser.forEach((user) => {
      user.removeAllObjects3D();
    });
    this.idToRemoteUser.clear();
    this.notifyPropertyChange('idToRemoteUser');
  }

  getUserById(id: string) {
    if (this.localUser.userId === id) {
      return this.localUser;
    } else {
      return this.idToRemoteUser.get(id);
    }
  }

  getAllRemoteUserIds() {
    return this.idToRemoteUser.keys();
  }

  getAllRemoteUsers() {
    return this.idToRemoteUser.values();
  }

  lookupRemoteUserById(userId: string): RemoteUser | undefined {
    return this.idToRemoteUser.get(userId);
  }

  getColor(userId: string) {
    const remoteUser = this.lookupRemoteUserById(userId);
    if (!remoteUser) {
      return `#${this.localUser.color?.getHexString()}`;
    }
    return `#${remoteUser?.color.getHexString()}`;
  }

  /**
   * After succesfully connecting to the backend, create and spawn other users.
   */
  onSelfConnected({ self, users }: SelfConnectedMessage): void {
    this.debug(`Self connected stuff${self.name}`);
    // Create User model for all users and add them to the users map by
    // simulating the event of a user connecting.
    users.forEach((userData) => {
      const remoteUser = this.userFactory.createUser({
        userName: userData.name,
        userId: userData.id,
        color: userData.color,
        position: userData.position,
        quaternion: userData.quaternion,
      });
      this.addRemoteUser(remoteUser);
    });

    this.connectionStatus = 'online';
    // Initialize local user.
    this.localUser.connected({
      id: self.id,
      name: self.name,
      color: new THREE.Color(self.color.red, self.color.green, self.color.blue),
    });

    // Ensure same settings for all users in collaboration session
    this.userSettings.applyDefaultApplicationSettings(false);

    this.toastHandlerService.showSuccessToastMessage(
      'Joined room successfully'
    );
  }

  // Display to other users when another user joins the room
  // Creates remoteUser for this joined user and puts it in the remoteUserGroup
  onUserConnected({
    id,
    name,
    color,
    position,
    quaternion,
  }: UserConnectedMessage): void {
    const remoteUser = this.userFactory.createUser({
      userName: name,
      userId: id,
      color,
      position,
      quaternion,
    });
    this.addRemoteUser(remoteUser);

    this.toastHandlerService.showInfoToastMessage(
      `User connected: ${remoteUser.userName}`
    );
  }

  /**
   * Removes the user that disconnected and informs our user about it.
   *
   * @param {JSON} data - Contains the id of the user that disconnected.
   */
  onUserDisconnect({ id, highlightedComponents }: UserDisconnectedMessage) {
    // Remove user and show disconnect notification.
    const removedUser = this.removeRemoteUserById(id);
    if (removedUser) {
      this.toastHandlerService.showInfoToastMessage(
        `User disconnected: ${removedUser.userName}`
      );
    }

    // walk trough all highlighted entities and unhighlight them
    for (const highlightedEntityComponent of highlightedComponents) {
      const { highlightedApp, highlightedEntity } = highlightedEntityComponent;
      if (highlightedApp !== '') {
        const application =
          this.applicationRenderer.getApplicationById(highlightedApp);
        if (application) {
          const mesh = application.getMeshById(highlightedEntity);
          if (isEntityMesh(mesh)) {
            this.highlightingService.toggleHighlight(mesh, {
              sendMessage: false,
            });
          }
        }
      } else {
        //extern Link
        const link = this.linkRenderer.getLinkById(highlightedEntity);
        if (link) {
          this.highlightingService.toggleHighlight(link, {
            sendMessage: false,
          });
        }
      }
    }
  }

  onSelfDisconnected(event?: any) {
    this.disconnect();

    if (this.isConnecting) {
      this.toastHandlerService.showInfoToastMessage(
        'Collaboration backend service not responding.'
      );
    } else if (event) {
      switch (event) {
        case 'io client disconnect':
          this.toastHandlerService.showInfoToastMessage(
            'Successfully disconnected'
          );
          break;
        default:
          this.toastHandlerService.showErrorToastMessage(
            'Unexpected disconnect'
          );
      }
    }

    // Remove remote users.
    this.removeAllRemoteUsers();

    this.highlightingService.resetColorsOfHighlightedEntities();
    this.userSettings.restoreApplicationSettings();

    // TODO handle this by listening to the selfDisconnectEvent in the highlightingService?
    this.highlightingService.updateHighlighting();

    this.disconnect();
  }

  get isOnline() {
    return this.connectionStatus === 'online';
  }

  get isConnecting() {
    return this.connectionStatus === 'connecting';
  }

  async hostRoom(roomId = '') {
    if (
      !this.isConnecting &&
      !this.isOnline &&
      this.applicationRenderer.getOpenApplications().length > 0
    ) {
      // this.connectionStatus = 'connecting';
      try {
        const response = await this.roomService.createRoom(roomId);
        this.joinRoom(response.roomId);
        return true;
      } catch (e: any) {
        // this.connectionStatus = 'offline';
        this.toastHandlerService.showErrorToastMessage(
          'Cannot reach Collaboration-Service.'
        );
        return false;
      }
    } else {
      return false;
    }
  }

  async joinRoom(roomId: string) {
    if (this.isConnecting) {
      this.toastHandlerService.showErrorToastMessage(
        'Tried to join room while already connecting to a room.'
      );
      return;
    }

    const rooms = await this.roomService.listRooms();
    const room = rooms.find((room) => room.roomId === roomId);
    if (!room) {
      this.toastHandlerService.showErrorToastMessage(
        'Could not find room with ID ' + roomId
      );
      return;
    }

    const tokens = await this.tokenService.retrieveTokens();
    const token = tokens.find((elem) => elem.value === room.landscapeToken);

    if (token) {
      this.tokenService.setToken(token);
      this.router.transitionTo('visualization', {
        queryParams: { landscapeToken: token.value, roomId: roomId },
      });
    } else {
      this.toastHandlerService.showErrorToastMessage(
        'Could not find landscape token for room to join.'
      );
      return;
    }

    this.connectionStatus = 'connecting';
    this.currentRoomId = roomId;

    const delay = 100;
    const maxRetries = 5; // Maximum number of retry attempts
    let retries = 0;
    while (retries < maxRetries) {
      try {
        const response = await this.roomService.joinLobby(this.currentRoomId);
        this.webSocket.initSocket(
          response.ticketId,
          this.localUser.visualizationMode
        );
        break; // Break out of the loop if successful
      } catch (e) {
        if (retries === maxRetries - 1) {
          // If this is the last retry attempt, handle the error and break out of the loop
          this.connectionStatus = 'offline';
          this.currentRoomId = null;
          this.toastHandlerService.showErrorToastMessage(
            'Cannot reach Collaboration-Service after multiple retries.'
          );
          break;
        }
        retries++;
        console.error('Error: Unable to join lobby. Retrying...', e);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Switch to offline mode, close socket connection
   */
  disconnect() {
    this.connectionStatus = 'offline';
    this.currentRoomId = null;
    this.webSocket.closeSocket();

    // Remove roomId from URL
    if (this.router.currentRouteName === 'visualization') {
      this.router.transitionTo('visualization', {
        queryParams: { roomId: null },
      });
    }
  }

  /**
   * Updates the specified user's camera and controller positions.
   */
  onUserPositions({
    userId,
    originalMessage: { camera, controller1, controller2 },
  }: ForwardedMessage<UserPositionsMessage>): void {
    const remoteUser = this.lookupRemoteUserById(userId);
    if (!remoteUser) return;

    if (controller1) remoteUser.updateController(CONTROLLER_1_ID, controller1);
    if (controller2) remoteUser.updateController(CONTROLLER_2_ID, controller2);
    if (camera) remoteUser.updateCamera(camera);
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'collaboration-session': CollaborationSession;
  }
}
