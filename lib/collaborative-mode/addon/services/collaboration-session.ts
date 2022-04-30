import Service, { inject as service } from '@ember/service';
import RemoteUser from 'collaborative-mode/utils/remote-user';
import debugLogger from 'ember-debug-logger';
import ToastMessage from 'explorviz-frontend/services/toast-message';
import THREE from 'three';
import WebSocketService from 'virtual-reality/services/web-socket';
import { SelfConnectedMessage, SELF_CONNECTED_EVENT } from 'virtual-reality/utils/vr-message/receivable/self_connected';
import { UserConnectedMessage, USER_CONNECTED_EVENT } from 'virtual-reality/utils/vr-message/receivable/user_connected';
import { UserDisconnectedMessage, USER_DISCONNECTED_EVENT } from 'virtual-reality/utils/vr-message/receivable/user_disconnect';
import LocalUser from './local-user';
import UserFactory from './user-factory';

export default class CollaborationSession extends Service.extend({
  // anything which *must* be merged to prototype here
}) {

  debug = debugLogger("CollaborationSession");

  @service('toast-message')
  toastMessage!: ToastMessage;

  @service('web-socket')
  private webSocket!: WebSocketService;

  @service('local-user')
  private localUser!: LocalUser;

  @service('user-factory')
  private userFactory!: UserFactory;

  private idToRemoteUser: Map<string, RemoteUser> = new Map();

  readonly remoteUserGroup: THREE.Group = new THREE.Group(); // TODO AR ONLY

  init() {
    super.init();

    this.debug('Initializing collaboration session');
    this.webSocket.on(SELF_CONNECTED_EVENT, this, this.onSelfConnected);
    this.webSocket.on(USER_CONNECTED_EVENT, this, this.onUserConnected);
    this.webSocket.on(USER_DISCONNECTED_EVENT, this, this.onUserDisconnect);
    this.webSocket.socketCloseCallback = () => this.onSelfDisconnected();
  }

  willDestroy() {
    this.webSocket.off(SELF_CONNECTED_EVENT, this, this.onSelfConnected);
    this.webSocket.off(USER_CONNECTED_EVENT, this, this.onUserConnected);
    this.webSocket.off(USER_DISCONNECTED_EVENT, this, this.onUserDisconnect);
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

    // Initialize local user.
    this.localUser.connected({
      id: self.id,
      name: self.name,
      color: new THREE.Color(...self.color),
    });

    // TODO handle VR user
    // this.sendInitialControllerConnectState();
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

    this.toastMessage.success(`User ${remoteUser.userName} connected.`);
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
      this.toastMessage.error(`User ${removedUser.userName} disconnected.`);
    }
  }

  onSelfDisconnected(event?: any) {
    if (this.localUser.isConnecting) {
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

    // // Reset highlighting colors.
    // this.webglrenderer.getOpenApplications().forEach((application) => {
    //   application.setHighlightingColor(
    //     this.configuration.applicationColors.highlightedEntityColor,
    //   );
    // });

    this.localUser.disconnect();
  }

}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'collaboration-session': CollaborationSession;
  }
}
