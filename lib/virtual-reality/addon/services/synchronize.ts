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
import WebSocketService, { SELF_DISCONNECTED_EVENT } from './web-socket';
import SynchronizationSession, {
  ProjectorAngles,
  ProjectorQuaternions,
} from 'collaborative-mode/services/synchronization-session';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';

export default class SynchronizeService extends Service {
  debug = debugLogger('synchronizeService');

  @service('local-user')
  private localUser!: LocalUser;

  @service('application-renderer')
  applicationRenderer!: ApplicationRenderer;

  @service('vr-message-sender')
  private sender!: VrMessageSender;

  @service('collaboration-session')
  collaborationSession!: CollaborationSession;

  @service('synchronization-session')
  synchronizationSession!: SynchronizationSession;

  @service('web-socket')
  private webSocket!: WebSocketService;

  @service('toast-message')
  toastMessage!: ToastMessage;

  main: RemoteUser | null = null;

  cameraControls: CameraControls | null = null;

  private projectors: Set<string> = new Set<string>();

  private synchronizationStartQuaternion: THREE.Quaternion =
    new THREE.Quaternion();

  private synchronizationStartPosition: THREE.Vector3 = new THREE.Vector3();

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
    this.projectors.clear();
    this.main = null;
  }

  private addProjector(id: string) {
    this.projectors.add(id);
  }

  private removeProjector(id: string) {
    this.projectors.delete(id);
  }

  get isSynchronized() {
    return this.main !== null;
  }

  lastPose?: VrPose;

  private lastMainQuaternion: THREE.Quaternion | null = null;

  // Could be done by parser
  private projectorQuaternions!: ProjectorQuaternions;
  private projectorAngles!: ProjectorAngles;

  /**
   * Used in spectating mode to set user's camera position to the spectated user's position
   */
  tick() {
    if (this.main?.camera) {
      if (this.localUser.xr?.isPresenting) {
        this.localUser.teleportToPosition(this.main.camera.model.position);
      } else {
        this.localUser.camera.position.copy(this.main.camera.model.position);

        // If the last known quaternion is different or not yet set => copy quaternion and apply multiplication
        if (
          !this.lastMainQuaternion ||
          !this.main.camera.model.quaternion.equals(this.lastMainQuaternion)
        ) {
          this.localUser.camera.quaternion.copy(
            this.main.camera.model.quaternion.multiply(
              this.projectorQuaternions.quaternions[
                this.synchronizationSession.deviceId - 1 // deviceId - 1 == array index
              ]
            )
          );
          this.localUser.camera.updateProjectionMatrix();
          this.lastMainQuaternion = this.main.camera.model.quaternion.clone(); // Update the stored quaternion
        }
      }
    } else if (this.projectors.size > 0) {
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
  activate(remoteUser: RemoteUser) {
    this.synchronizationStartQuaternion.copy(this.localUser.camera.quaternion);
    this.synchronizationStartPosition.copy(this.localUser.camera.position);

    this.main = remoteUser;
    if (this.localUser.controller1) {
      this.localUser.controller1.setToSpectatingAppearance();
    }
    if (this.localUser.controller2) {
      this.localUser.controller2.setToSpectatingAppearance();
    }
    if (this.cameraControls) {
      this.cameraControls.enabled = false;
    }

    this.sender.sendSpectatingUpdate(this.isSynchronized, remoteUser.userId);

    this.projectorQuaternions = this.synchronizationSession.setUpQuaternions();
    this.projectorAngles = this.synchronizationSession.setUpFovAspectArr();
    this.synchronizationSession.setUpFovAspect(
      this.projectorAngles.angles[this.synchronizationSession.deviceId]
    );
  }

  /**
   * Deactives spectator mode for our user
   */
  deactivate() {
    if (this.cameraControls) {
      this.cameraControls.enabled = true;
    }
    if (!this.main) return;

    if (this.localUser.controller1) {
      this.localUser.controller1.setToDefaultAppearance();
    }
    if (this.localUser.controller2) {
      this.localUser.controller2.setToDefaultAppearance();
    }

    this.localUser.camera.quaternion.copy(this.synchronizationStartQuaternion);
    this.main = null;

    this.sender.sendSpectatingUpdate(this.isSynchronized, null);
  }

  private onUserDisconnect({ id }: UserDisconnectedMessage) {
    this.removeProjector(id);

    if (this.main?.userId === id) {
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
    const remoteUser = this.setRemoteUserSpectatingById(userId, isSpectating);
    if (!remoteUser) return;

    const remoteUserHexColor = `#${remoteUser.color.getHexString()}`;
    let text = '';
    if (isSpectating && spectatedUser === this.localUser.userId) {
      this.addProjector(userId);
      text = 'is now synchronized to you';
    } else if (isSpectating) {
      text = 'is now synchronized to you';
    } else {
      text = 'stopped being synchronized to you';
      this.removeProjector(userId);
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
    isProjector: boolean
  ): RemoteUser | undefined {
    const remoteUser = this.collaborationSession.idToRemoteUser.get(userId);
    if (remoteUser) {
      remoteUser.state = isProjector ? 'synchronized' : 'not synchronized';
      remoteUser.setVisible(!isProjector);

      // If we spectated the remote user before, stop spectating.
      if (isProjector && this.main?.userId === remoteUser.userId) {
        this.deactivate();
      }
    }
    return remoteUser;
  }
}

declare module '@ember/service' {
  interface Registry {
    synchronize: SynchronizeService;
  }
}
