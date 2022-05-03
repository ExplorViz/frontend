import Service, { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import RemoteUser from 'collaborative-mode/utils/remote-user';
import { timeout } from 'ember-concurrency';
import { restartableTask } from 'ember-concurrency-decorators';
import { perform } from 'ember-concurrency-ts';
import debugLogger from 'ember-debug-logger';
import HighlightingService from 'explorviz-frontend/services/highlighting-service';
import ToastMessage from 'explorviz-frontend/services/toast-message';
import AlertifyHandler from 'explorviz-frontend/utils/alertify-handler';
import THREE from 'three';
import SpectateUserService from 'virtual-reality/services/spectate-user';
import VrMessageSender from 'virtual-reality/services/vr-message-sender';
import VrRoomService from 'virtual-reality/services/vr-room';
import WebSocketService from 'virtual-reality/services/web-socket';
import * as VrPoses from 'virtual-reality/utils/vr-helpers/vr-poses';
import { ForwardedMessage } from 'virtual-reality/utils/vr-message/receivable/forwarded';
import { SelfConnectedMessage, SELF_CONNECTED_EVENT } from 'virtual-reality/utils/vr-message/receivable/self_connected';
import { UserConnectedMessage, USER_CONNECTED_EVENT } from 'virtual-reality/utils/vr-message/receivable/user_connected';
import { UserDisconnectedMessage, USER_DISCONNECTED_EVENT } from 'virtual-reality/utils/vr-message/receivable/user_disconnect';
import { SpectatingUpdateMessage, SPECTATING_UPDATE_EVENT } from 'virtual-reality/utils/vr-message/sendable/spectating_update';
import { UserPositionsMessage, USER_POSITIONS_EVENT } from 'virtual-reality/utils/vr-message/sendable/user_positions';
import { CONTROLLER_1_ID, CONTROLLER_2_ID } from 'virtual-reality/utils/vr-message/util/controller_id';
import RemoteVrUser from 'virtual-reality/utils/vr-multi-user/remote-vr-user';
import LocalUser from './local-user';
import UserFactory from './user-factory';

export type ConnectionStatus = 'offline' | 'connecting' | 'online';

export default class CollaborationSession extends Service.extend({
  // anything which *must* be merged to prototype here
}) {

  debug = debugLogger("CollaborationSession");

  @service('toast-message')
  toastMessage!: ToastMessage;

  @service('web-socket')
  private webSocket!: WebSocketService;

  @service('vr-room')
  private roomService!: VrRoomService;

  @service('local-user')
  private localUser!: LocalUser;

  @service('user-factory')
  private userFactory!: UserFactory;

  @service('highlighting-service')
  private highlightingService!: HighlightingService;

  @service('vr-message-sender')
  private sender!: VrMessageSender;

  @service('spectate-user')
  private spectateUserService!: SpectateUserService;

  idToRemoteUser: Map<string, RemoteUser> = new Map();

  readonly remoteUserGroup: THREE.Group = new THREE.Group(); // TODO AR ONLY

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
    this.webSocket.on(SPECTATING_UPDATE_EVENT, this, this.onSpectatingUpdate);
    this.webSocket.socketCloseCallback = () => this.onSelfDisconnected();
  }

  willDestroy() {
    this.webSocket.off(SELF_CONNECTED_EVENT, this, this.onSelfConnected);
    this.webSocket.off(USER_CONNECTED_EVENT, this, this.onUserConnected);
    this.webSocket.off(USER_DISCONNECTED_EVENT, this, this.onUserDisconnect);
    this.webSocket.off(USER_POSITIONS_EVENT, this, this.onUserPositions);
    this.webSocket.off(SPECTATING_UPDATE_EVENT, this, this.onSpectatingUpdate);
  }

  addRemoteUser(remoteUser: RemoteUser) {
    // Make sure that the user does not already exist.
    if (this.idToRemoteUser.has(remoteUser.userId)) this.removeRemoteUser(remoteUser);

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
    // Stop spectating removed user.
    // TODO spectate
    // if (this.spectateUserService.spectatedUser?.userId === remoteUser.userId) {
    //   this.spectateUserService.deactivate();
    // }

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

  updateRemoteUsers() {
    // updateRemoteUsers(delta: number) {
    // this.idToRemoteUser.forEach((remoteUser) => remoteUser.update(delta));
    // this.notifyPropertyChange('idToRemoteUser');
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

  /**
   * After succesfully connecting to the backend, create and spawn other users.
   */
  onSelfConnected({ self, users }: SelfConnectedMessage): void {
    this.debug('Self connected stuff' + self.name);
    // Create User model for all users and add them to the users map by
    // simulating the event of a user connecting.
    for (var userData of users) {
      const remoteUser = this.userFactory.createUser({
        userName: userData.name,
        userId: userData.id,
        color: userData.color,
        position: userData.position,
        quaternion: userData.quaternion
      });
      this.addRemoteUser(remoteUser);
    }

    this.connectionStatus = 'online';
    // Initialize local user.
    this.localUser.connected({
      id: self.id,
      name: self.name,
      color: new THREE.Color(...self.color),
    });
    perform(this.sendPose);

    // TODO handle VR user
    this.sender.sendControllerConnect(this.localUser.controller1);
    this.sender.sendControllerConnect(this.localUser.controller2);
  }

  onUserConnected(
    {
      id, name, color, position, quaternion,
    }: UserConnectedMessage
  ): void {
    const remoteUser = this.userFactory.createUser({
      userName: name,
      userId: id,
      color: color,
      position: position,
      quaternion: quaternion
    })
    this.addRemoteUser(remoteUser)

    this.toastMessage.success({
      title: 'User connected',
      text: remoteUser.userName,
      color: `#${remoteUser.color.getHexString()}`,
      time: 3.0,
    });
  }
  /**
   * Removes the user that disconnected and informs our user about it.
   *
   * @param {JSON} data - Contains the id of the user that disconnected.
   */
  onUserDisconnect({ id }: UserDisconnectedMessage) {
    // Remove user and show disconnect notification.
    const removedUser = this.removeRemoteUserById(id);
    if (removedUser) {
      this.toastMessage.message({
        title: 'User disconnected',
        text: removedUser.userName,
        color: `#${removedUser.color.getHexString()}`,
        time: 3.0,
      });
    }
  }

  onSelfDisconnected(event?: any) {
    if (this.isConnecting) {
      this.toastMessage.info('Collaboration backend service not responding');
    } else if (event) {
      switch (event.code) {
        case 1000: // Normal Closure
          this.toastMessage.info('Successfully disconnected');
          break;
        case 1006: // Abnormal closure
          this.toastMessage.error('Collaboration backend service closed abnormally');
          break;
        default:
          this.toastMessage.error('Unexpected disconnect');
      }
    }

    // Remove remote users.
    this.removeAllRemoteUsers();

    this.highlightingService.updateHighlightingForAllApplications();

    this.disconnect();
  }

  get isOnline() {
    return this.connectionStatus === 'online';
  }

  get isConnecting() {
    return this.connectionStatus === 'connecting';
  }

  async hostRoom() {
    if (!this.isConnecting) {
      this.connectionStatus = 'connecting';
      try {
        const response = await this.roomService.createRoom();
        this.joinRoom(response.roomId, { checkConnectionStatus: false });
      } catch (e: any) {
        this.connectionStatus = 'offline';
        AlertifyHandler.showAlertifyError('Cannot reach Collaboration-Service.');
      }
    }
  }

  async joinRoom(roomId: string, {
    checkConnectionStatus = true,
  }: { checkConnectionStatus?: boolean } = {}) {
    if (!checkConnectionStatus || !this.isConnecting) {
      this.connectionStatus = 'connecting';
      this.currentRoomId = roomId;
      try {
        const response = await this.roomService.joinLobby(this.currentRoomId);
        // TODO this is not reachable here and should never be
        this.webSocket.initSocket(response.ticketId);
      } catch (e: any) {
        this.connectionStatus = 'offline';
        this.currentRoomId = null;
        AlertifyHandler.showAlertifyError('Cannot reach Collaboration-Service.');
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
  }

  @restartableTask *
    sendPose() {
    while (this.isOnline) {
      const poses = VrPoses.getPoses(
        this.localUser.camera,
        this.localUser.controller1,
        this.localUser.controller2,
      );
      this.sender.sendPoseUpdate(
        poses.camera,
        poses.controller1,
        poses.controller2,
      );
      yield timeout(15);
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

    if (remoteUser instanceof RemoteVrUser) {
      if (controller1) remoteUser.updateController(CONTROLLER_1_ID, controller1);
      if (controller2) remoteUser.updateController(CONTROLLER_2_ID, controller2);
    }
    if (camera) remoteUser.updateCamera(camera);
  }

  /**
   * Updates the state of given user to spectating or connected.
   * Hides them if spectating.
   *
   * @param {string} userId - The user's id.
   * @param {boolean} isSpectating - True, if the user is now spectating, else false.
   */
  onSpectatingUpdate({
    userId,
    originalMessage: { isSpectating },
  }: ForwardedMessage<SpectatingUpdateMessage>): void {
    // TODO spectating
    const remoteUser = this.setRemoteUserSpectatingById(
      userId,
      isSpectating,
    );
    if (!remoteUser) return;

    const remoteUserHexColor = `#${remoteUser.color.getHexString()}`;
    if (isSpectating) {
      this.toastMessage.message({
        title: remoteUser.userName,
        text: ' is now spectating',
        color: remoteUserHexColor,
        time: 3.0,
      });
    } else {
      this.toastMessage.message({
        title: remoteUser.userName,
        text: ' stopped spectating',
        color: remoteUserHexColor,
        time: 3.0,
      });
    }
  }

  setRemoteUserSpectatingById(
    userId: string,
    isSpectating: boolean,
  ): RemoteUser | undefined {
    const remoteUser = this.idToRemoteUser.get(userId);
    if (remoteUser) this.setRemoteUserSpectating(remoteUser, isSpectating);
    return remoteUser;
  }

  setRemoteUserSpectating(remoteUser: RemoteUser, isSpectating: boolean) {
    remoteUser.state = isSpectating ? 'spectating' : 'online';
    if (remoteUser instanceof RemoteVrUser) {
      remoteUser.setVisible(!isSpectating);
    }

    // If we spectated the remote user before, stop spectating.
    if (
      isSpectating
      && this.spectateUserService.spectatedUser?.userId === remoteUser.userId
    ) {
      this.spectateUserService.deactivate();
    }
  }

}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'collaboration-session': CollaborationSession;
  }
}
