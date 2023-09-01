import Service, { inject as service } from '@ember/service';
import CollaborationSession from 'collaborative-mode/services/collaboration-session';
import LocalUser from 'collaborative-mode/services/local-user';
import RemoteUser from 'collaborative-mode/utils/remote-user';
import debugLogger from 'ember-debug-logger';
import ToastMessage from 'explorviz-frontend/services/toast-message';
import CameraControls from 'explorviz-frontend/utils/application-rendering/camera-controls';
import * as THREE from 'three';
import VrMessageSender from 'virtual-reality/services/vr-message-sender';
import { VrPose } from 'virtual-reality/utils/vr-helpers/vr-poses';
import SynchronizationSession from 'collaborative-mode/services/synchronization-session';
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

  private synchronizationStartQuaternion: THREE.Quaternion =
    new THREE.Quaternion();

  private synchronizationStartPosition: THREE.Vector3 = new THREE.Vector3();

  get isSynchronized() {
    return this.main !== null;
  }

  lastPose?: VrPose;

  /**
   * Used in spectating mode to set user's camera position to the spectated user's position.
   * Here it is modified and manipulating the copied position and quaternion according to specific needs in ARENA2.
   */
  tick() {
    if (this.main?.camera) {
      // Copy position and quaternion, then prepare or update the projectionmatrix
      this.localUser.camera.position.copy(this.main.camera.model.position);
      const neutral = this.main.camera.model.quaternion;
      this.localUser.camera.quaternion.copy(neutral);
      this.localUser.camera.updateProjectionMatrix();

      /** ARENA LÖSUNG */

      // const projectorQuaternions =
      //   this.synchronizationSession.setUpQuaternionArr();
      // const anim_active = Math.sin(new Date().getTime() / 2000) / 2 + 0.5;
      // const neutral2 = this.main.camera.model.quaternion;
      // const warped = this.main.camera.model.quaternion
      //   .clone()
      //   .multiply(
      //     projectorQuaternions.quaternions[
      //     this.synchronizationSession.deviceId - 1
      //     ]
      //   );

      // const warped2 = projectorQuaternions.quaternions[
      //   this.synchronizationSession.deviceId - 1
      // ]
      //   .clone()
      //   .multiply(this.main.camera.model.quaternion);

      // const lerped = warped2.clone().slerp(warped, anim_active);

      // this.localUser.camera.quaternion.copy(neutral);
      // this.localUser.camera.updateProjectionMatrix();
      // const projectorAngles = this.synchronizationSession.setUpAngleArr();
      // const angles =
      //   projectorAngles.angles[this.synchronizationSession.deviceId - 1];
      // this.localUser.camera.projectionMatrix.copy(
      //   new THREE.Matrix4().makePerspective(
      //     -Math.tan(angles.left * DEG2RAD) * this.localUser.camera.near,
      //     Math.tan(angles.right * DEG2RAD) * this.localUser.camera.near,
      //     Math.tan(angles.up * DEG2RAD) * this.localUser.camera.near,
      //     -Math.tan(angles.down * DEG2RAD) * this.localUser.camera.near,
      //     this.localUser.camera.near,
      //     this.localUser.camera.far
      //   )
      // );

      // this.localUser.camera.projectionMatrix.multiply(
      //   new THREE.Matrix4().makeRotationFromQuaternion(
      //     projectorQuaternions.quaternions[
      //     this.synchronizationSession.deviceId - 1
      //     ]
      //   )
      // );

      const dometilt = 1;
      // Set up fov and aspect
      this.localUser.camera.projectionMatrix.copy(
        new THREE.Matrix4().makePerspective(
          -Math.tan(
            this.synchronizationSession.projectorAngles.left * DEG2RAD
          ) * this.localUser.camera.near,
          Math.tan(
            this.synchronizationSession.projectorAngles.right * DEG2RAD
          ) * this.localUser.camera.near,
          Math.tan(
            (this.synchronizationSession.projectorAngles.down - dometilt) * DEG2RAD 
          ) * this.localUser.camera.near,
          -Math.tan(
            (this.synchronizationSession.projectorAngles.up + dometilt) * DEG2RAD 
          ) * this.localUser.camera.near,
          this.localUser.camera.near,
          this.localUser.camera.far
        )
      );

      // manipulate main's quaternion
      this.localUser.camera.projectionMatrix.multiply(
        new THREE.Matrix4().makeRotationFromQuaternion(
          this.synchronizationSession.projectorQuaternion?.quaternion
        )
      );
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

    // Fov and aspect camera
    this.synchronizationSession.setUpCamera(
      this.synchronizationSession.projectorAngles
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
