import Service, { inject as service } from '@ember/service';
import CollaborationSession from 'collaborative-mode/services/collaboration-session';
import LocalUser from 'collaborative-mode/services/local-user';
import RemoteUser from 'collaborative-mode/utils/remote-user';
import debugLogger from 'ember-debug-logger';
import ToastMessage from 'explorviz-frontend/services/toast-message';
import CameraControls from 'explorviz-frontend/utils/application-rendering/camera-controls';
import * as THREE from 'three';
import VrMessageSender from 'virtual-reality/services/vr-message-sender';
import * as VrPoses from 'virtual-reality/utils/vr-helpers/vr-poses';
import { VrPose } from 'virtual-reality/utils/vr-helpers/vr-poses';
import { ForwardedMessage } from 'virtual-reality/utils/vr-message/receivable/forwarded';
import {
  UserDisconnectedMessage,
  USER_DISCONNECTED_EVENT,
} from 'virtual-reality/utils/vr-message/receivable/user_disconnect';
import {
  SpectatingUpdateMessage,
  SPECTATING_UPDATE_EVENT,
} from 'virtual-reality/utils/vr-message/sendable/spectating_update';
import WebSocketService, {
  SELF_DISCONNECTED_EVENT,
} from 'virtual-reality/services/web-socket';

export default class SpectateUser extends Service {
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

  cameraControls: CameraControls | null = null;

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
          this.spectatedUser.camera.model.position
        );
      } else {
        this.localUser.camera.position.copy(
          this.spectatedUser.camera.model.position
        );
        this.localUser.camera.quaternion.copy(
          this.spectatedUser.camera.model.quaternion
        );
      }
    } else if (this.spectatingUsers.size > 0) {
      const poses = VrPoses.getPoses(
        this.localUser.camera,
        this.localUser.controller1,
        this.localUser.controller2
      );
      if (JSON.stringify(this.lastPose) !== JSON.stringify(poses)) {
        this.sender.sendPoseUpdate(
          poses.camera,
          poses.controller1,
          poses.controller2
        );
      }
      this.lastPose = poses;
    }
  }

  /**
   * Switches our user into spectator mode
   * @param {number} userId The id of the user to be spectated
   */
  activate(remoteUser: RemoteUser, sendUpdate = true) {
    this.startQuaternion.copy(this.localUser.camera.quaternion);
    this.spectatedUser = remoteUser;

    if (this.localUser.controller1) {
      this.localUser.controller1.setToSpectatingAppearance();
    }
    if (this.localUser.controller2) {
      this.localUser.controller2.setToSpectatingAppearance();
    }
    if (this.cameraControls) {
      this.cameraControls.enabled = false;
    }

    // remoteUser.setHmdVisible(false);
    if (sendUpdate) {
      this.sender.sendSpectatingUpdate(this.isActive, remoteUser.userId, [
        this.localUser.userId,
      ]);
    }
  }

  activateConfig(configId: string, remoteUsersIds: string[]) {
    if (configId === 'arena-2') {
      this.sender.sendSpectatingUpdate(
        true,
        this.localUser.userId,
        remoteUsersIds,
        configId
      );
    } else {
      this.sender.sendSpectatingUpdate(
        false,
        this.localUser.userId,
        remoteUsersIds,
        configId
      );
    }
  }

  /**
   * Deactives spectator mode for our user
   */
  deactivate(sendUpdate = true) {
    if (this.cameraControls) {
      this.cameraControls.enabled = true;
    }
    if (!this.spectatedUser) return;

    if (this.localUser.controller1) {
      this.localUser.controller1.setToDefaultAppearance();
    }
    if (this.localUser.controller2) {
      this.localUser.controller2.setToDefaultAppearance();
    }

    this.localUser.camera.quaternion.copy(this.startQuaternion);
    this.spectatedUser = null;

    if (sendUpdate) {
      this.sender.sendSpectatingUpdate(this.isActive, null, []);
    }
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
    originalMessage: {
      isSpectating,
      spectatedUser,
      spectatingUsers,
      configuration,
    },
  }: ForwardedMessage<SpectatingUpdateMessage>): void {
    // Deactivate spectating?
    if (!isSpectating || !spectatedUser) {
      this.deactivate(false);
    }

    if (spectatedUser === this.localUser.userId) {
      spectatingUsers.forEach((spectatingUser) => {
        this.spectatingUsers.add(spectatingUser);
      });
      return;
    }

    // Adapt projection matrix according to spectate update
    const deviceId = new URLSearchParams(window.location.search).get(
      'deviceId'
    );
    if (configuration && deviceId) {
      const deviceConfig = configuration.find(
        (config) => config.deviceId === deviceId
      );
      if (deviceConfig) {
        this.localUser.camera.projectionMatrix.fromArray(
          deviceConfig.projectionMatrix
        );
      }
    }

    // Check if we should spectate a user
    let spectatedRemoteUser: RemoteUser | undefined;
    spectatingUsers.forEach((id) => {
      if (id === this.localUser.userId) {
        spectatedRemoteUser = this.collaborationSession.getRemoteUserById(
          spectatedUser!
        );
        if (spectatedRemoteUser) {
          this.activate(spectatedRemoteUser, false);
          return;
        }
      }
    });

    if (!spectatedRemoteUser) return;
    spectatedRemoteUser.state = isSpectating ? 'spectating' : 'online';
    spectatedRemoteUser.setVisible(!isSpectating);

    const remoteUserHexColor = `#${spectatedRemoteUser.color.getHexString()}`;
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
      title: spectatedRemoteUser.userName,
      text,
      color: remoteUserHexColor,
      time: 3.0,
    });
  }
}

declare module '@ember/service' {
  interface Registry {
    'spectate-user': SpectateUser;
  }
}
