import Service, { inject as service } from '@ember/service';
import CollaborationSession from 'collaborative-mode/services/collaboration-session';
import LocalUser from 'collaborative-mode/services/local-user';
import RemoteUser from 'collaborative-mode/utils/remote-user';
import debugLogger from 'ember-debug-logger';
import ToastMessage from 'explorviz-frontend/services/toast-message';
import THREE from 'three';
import VrMessageSender from 'virtual-reality/services/vr-message-sender';
import * as VrPoses from 'virtual-reality/utils/vr-helpers/vr-poses';
import { VrPose } from 'virtual-reality/utils/vr-helpers/vr-poses';
import { ForwardedMessage } from 'virtual-reality/utils/vr-message/receivable/forwarded';
import { UserDisconnectedMessage, USER_DISCONNECTED_EVENT } from 'virtual-reality/utils/vr-message/receivable/user_disconnect';
import { SpectatingUpdateMessage, SPECTATING_UPDATE_EVENT } from 'virtual-reality/utils/vr-message/sendable/spectating_update';
import WebSocketService, { SELF_DISCONNECTED_EVENT } from './web-socket';

export default class SpectateUserService extends Service {
  debug = debugLogger('spectateUserService');

  @service('local-user')
  private localUser!: LocalUser;

  @service('vr-message-sender')
  private sender!: VrMessageSender;

  @service('collaboration-session')
  collaborationSession!: CollaborationSession;

  @service('web-socket')
  private webSocket!: WebSocketService;

  @service('toast-message')
  toastMessage!: ToastMessage;

  spectatedUser: RemoteUser | null = null;

  private spectatingUsers: Set<string> = new Set<string>();

  // use this for VR?
  // private startPosition: THREE.Vector3 = new THREE.Vector3();

  private startQuaternion: THREE.Quaternion = new THREE.Quaternion();

  init() {
    super.init();

    this.debug('Initializing collaboration session');
    this.webSocket.on(USER_DISCONNECTED_EVENT, this, this.onUserDisconnect);
    this.webSocket.on(SPECTATING_UPDATE_EVENT, this, this.onSpectatingUpdate);
    this.webSocket.on(SELF_DISCONNECTED_EVENT, this, this.reset);
  }

  willDestroy() {
    this.webSocket.off(USER_DISCONNECTED_EVENT, this, this.onUserDisconnect);
    this.webSocket.off(SPECTATING_UPDATE_EVENT, this, this.onSpectatingUpdate);
    this.webSocket.off(SELF_DISCONNECTED_EVENT, this, this.reset);
  }

  private reset() {
    this.spectatingUsers.clear();
    this.spectatedUser = null;
  }

  private addSpectatingUser(id: string) {
    this.spectatingUsers.add(id);
  }

  private removeSpectatingUser(id: string) {
    this.spectatingUsers.delete(id);
  }

  get isActive() {
    return this.spectatedUser !== null;
  }

  lastPose?: VrPose;

  /**
   * Used in spectating mode to set user's camera position to the spectated user's position
   */
  tick() {
    if (this.spectatedUser?.camera) {
      if (this.localUser.xr?.isPresenting) {
        this.localUser.teleportToPosition(
          this.spectatedUser.camera.model.position,
          { adaptCameraHeight: true },
        );
      } else {
        this.localUser.camera.position.copy(this.spectatedUser.camera.model.position);
        this.localUser.camera.quaternion.copy(this.spectatedUser.camera.model.quaternion);
      }
    } else if (this.spectatingUsers.size > 0) {
      const poses = VrPoses.getPoses(
        this.localUser.camera,
        this.localUser.controller1,
        this.localUser.controller2,
      );
      if (JSON.stringify(this.lastPose) !== JSON.stringify(poses)) {
        this.sender.sendPoseUpdate(
          poses.camera,
          poses.controller1,
          poses.controller2,
        );
      }
      this.lastPose = poses;
    }
  }

  /**
   * Switches our user into spectator mode
   * @param {number} userId The id of the user to be spectated
   */
  activate(remoteUser: RemoteUser) {
    // this.startPosition.copy(this.localUser.getCameraWorldPosition());
    this.startQuaternion.copy(this.localUser.camera.quaternion);
    this.spectatedUser = remoteUser;

    if (this.localUser.controller1) {
      this.localUser.controller1.setToSpectatingAppearance();
    }
    if (this.localUser.controller2) {
      this.localUser.controller2.setToSpectatingAppearance();
    }

    // remoteUser.setHmdVisible(false);
    this.sender.sendSpectatingUpdate(this.isActive, remoteUser.userId);
  }

  /**
   * Deactives spectator mode for our user
   */
  deactivate() {
    if (!this.spectatedUser) return;

    if (this.localUser.controller1) {
      this.localUser.controller1.setToDefaultAppearance();
    }
    if (this.localUser.controller2) {
      this.localUser.controller2.setToDefaultAppearance();
    }

    // this.localUser.teleportToPosition(this.startPosition, {
    //   adaptCameraHeight: true,
    // });

    // this.localUser.camera.position.copy(this.startPosition);
    this.localUser.camera.quaternion.copy(this.startQuaternion);
    // this.spectatedUser.setHmdVisible(true);
    this.spectatedUser = null;

    this.sender.sendSpectatingUpdate(this.isActive, null);
  }

  private onUserDisconnect({ id }: UserDisconnectedMessage) {
    this.removeSpectatingUser(id);

    if (this.spectatedUser?.userId === id) {
      this.deactivate();
    }
  }

  /**
   * Updates the state of given user to spectating or connected.
   * Hides them if spectating.
   *
   * @param {string} userId - The user's id.
   * @param {boolean} isSpectating - True, if the user is now spectating, else false.
   */
  private onSpectatingUpdate({
    userId,
    originalMessage: { isSpectating, spectatedUser },
  }: ForwardedMessage<SpectatingUpdateMessage>): void {
    const remoteUser = this.setRemoteUserSpectatingById(
      userId,
      isSpectating,
    );
    if (!remoteUser) return;

    const remoteUserHexColor = `#${remoteUser.color.getHexString()}`;
    let text = '';
    if (isSpectating && spectatedUser === this.localUser.userId) {
      this.addSpectatingUser(userId);
      text = 'is now spectating you';
    } else if (isSpectating) {
      text = 'is now spectating';
    } else {
      text = 'stopped spectating';
      this.removeSpectatingUser(userId);
    }
    this.toastMessage.message({
      title: remoteUser.userName,
      text,
      color: remoteUserHexColor,
      time: 3.0,
    });
  }

  private setRemoteUserSpectatingById(
    userId: string,
    isSpectating: boolean,
  ): RemoteUser | undefined {
    const remoteUser = this.collaborationSession.idToRemoteUser.get(userId);
    if (remoteUser) {
      remoteUser.state = isSpectating ? 'spectating' : 'online';
      remoteUser.setVisible(!isSpectating);

      // If we spectated the remote user before, stop spectating.
      if (
        isSpectating
        && this.spectatedUser?.userId === remoteUser.userId
      ) {
        this.deactivate();
      }
    }
    return remoteUser;
  }
}

declare module '@ember/service' {
  interface Registry {
    'spectate-user': SpectateUserService;
  }
}
