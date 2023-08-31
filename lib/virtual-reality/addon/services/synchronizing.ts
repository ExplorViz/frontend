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
import SynchronizationSession, {
  ProjectorAngle,
  ProjectorAngles,
  ProjectorConfigurations,
  ProjectorQuaternion,
  ProjectorQuaternions,
} from 'collaborative-mode/services/synchronization-session';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';
import { DEG2RAD } from 'three/src/math/MathUtils';

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

  @service('toast-message')
  toastMessage!: ToastMessage;

  main: RemoteUser | null = null;

  cameraControls: CameraControls | null = null;

  private projectors: Set<string> = new Set<string>();

  private synchronizationStartQuaternion: THREE.Quaternion =
    new THREE.Quaternion();

  private synchronizationStartPosition: THREE.Vector3 = new THREE.Vector3();

  get isSynchronized() {
    return this.main !== null;
  }

  lastPose?: VrPose;

  private lastMainQuaternion: THREE.Quaternion | null = null;

  // Could be done by parser
  private projectorQuaternions!: ProjectorQuaternions;

  private projectorAngles!: ProjectorAngles;

  /**
   * Used in spectating mode to set user's camera position to the spectated user's position.
   * Here it is modified and manipulating the copied position and quaternion according to specific needs in ARENA2.
   */
  tick() {
    if (this.main?.camera) {
      this.localUser.camera.position.copy(this.main.camera.model.position);

      // Brauch ich evtl. noch, wenn ich wieder mit Camera arbeite
      // If the last known quaternion is different or not yet set => copy quaternion and apply multiplication
      /*if (
          !this.lastMainQuaternion ||
          !this.main.camera.model.quaternion.equals(this.lastMainQuaternion)
        ) {*/
      const neutral = this.main.camera.model.quaternion;

      // const matrixQ = new THREE.Matrix4().makeRotationFromQuaternion(neutral);
      // const q = new THREE.Quaternion().setFromRotationMatrix(matrixQ);

      // this.localUser.camera.quaternion.copy(q);
      this.localUser.camera.quaternion.copy(neutral);

      // this.localUser.camera.quaternion.premultiply(
      //   this.projectorQuaternions.quaternions[
      //   this.synchronizationSession.deviceId - 1
      //   ]
      // );
      this.localUser.camera.updateProjectionMatrix();
      // // FOV AND ASPECT
      // const angles =
      //   this.projectorAngles.angles[this.synchronizationSession.deviceId - 1];
      // this.localUser.camera.projectionMatrix.copy(
      //   new THREE.Matrix4().makePerspective(
      //     -Math.tan(angles.left * DEG2RAD) * this.localUser.camera.near,
      //     Math.tan(angles.right * DEG2RAD) * this.localUser.camera.near,
      //     Math.tan(angles.down * DEG2RAD) * this.localUser.camera.near,
      //     -Math.tan(angles.up * DEG2RAD) * this.localUser.camera.near,
      //     this.localUser.camera.near,
      //     this.localUser.camera.far
      //   )
      // );

      this.localUser.camera.projectionMatrix.multiply(
        new THREE.Matrix4().makeRotationFromQuaternion(
          this.projectorQuaternions.quaternions[
          this.synchronizationSession.deviceId - 1
          ]
        )
      );

      this.lastMainQuaternion = this.main.camera.model.quaternion.clone(); // Update the stored quaternion
      //}
    }
  }

  /**
   * Switches our user (usually projector) into synchronization mode
   * @param {RemoteUser} remoteUser The user (main) to be synchronized to
   */
  activate(remoteUser: RemoteUser) {
    this.synchronizationStartQuaternion.copy(this.localUser.camera.quaternion);
    this.synchronizationStartPosition.copy(this.localUser.camera.position);

    this.main = remoteUser;
    if (this.cameraControls) {
      this.cameraControls.enabled = false;
    }

    // Sets up lists for quaternion and angles for projector
    this.projectorQuaternions =
      this.synchronizationSession.setUpQuaternionArr();
    this.projectorAngles = this.synchronizationSession.setUpAngleArr();

    this.synchronizationSession.setUpCamera(
      this.projectorAngles.angles[this.synchronizationSession.deviceId - 1]
    );

    this.sender.sendSpectatingUpdate(this.isSynchronized, remoteUser.userId);
  }

  /**
   * Deactives spectator mode for our user
   */
  deactivate() {
    if (this.cameraControls) {
      this.cameraControls.enabled = true;
    }
    if (!this.main) return;
    this.localUser.camera.quaternion.copy(this.synchronizationStartQuaternion);
    this.main = null;

    this.sender.sendSpectatingUpdate(this.isSynchronized, null);
  }
}

declare module '@ember/service' {
  interface Registry {
    synchronize: SynchronizeService;
  }
}
