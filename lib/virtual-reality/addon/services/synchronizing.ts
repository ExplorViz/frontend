import Service, { inject as service } from '@ember/service';
import LocalUser from 'collaborative-mode/services/local-user';
import RemoteUser from 'collaborative-mode/utils/remote-user';
import debugLogger from 'ember-debug-logger';
import CameraControls from 'explorviz-frontend/utils/application-rendering/camera-controls';
import * as THREE from 'three';
import VrMessageSender from 'virtual-reality/services/vr-message-sender';
import SynchronizationSession from 'collaborative-mode/services/synchronization-session';

export default class SynchronizeService extends Service {
  debug = debugLogger('synchronizeService');

  @service('local-user')
  private localUser!: LocalUser;

  @service('vr-message-sender')
  private sender!: VrMessageSender;

  @service('synchronization-session')
  synchronizationSession!: SynchronizationSession;

  main: RemoteUser | null = null;

  cameraControls: CameraControls | null = null;

  // In case we want to implement a deactivation of synchronization
  private synchronizationStartQuaternion: THREE.Quaternion =
    new THREE.Quaternion();
  // In case we want to implement a deactivation of synchronization
  private synchronizationStartPosition: THREE.Vector3 = new THREE.Vector3();

  get isSynchronized() {
    return this.main !== null;
  }

  /**
   * Used in spectating mode to set user's camera position to the spectated user's position.
   * Here it is modified and manipulating the copied position and quaternion according to specific needs in ARENA2.
   */
  tick() {
    if (this.main?.camera) {
      // Copy position and quaternion, then prepare or update the projectionmatrix
      this.localUser.camera.position.copy(this.main.camera.model.position);

      // Rotation test
      const mainQuaternion = this.main.camera.model.quaternion.clone();
      this.localUser.camera.quaternion.copy(mainQuaternion);

      // Set up projector configuration
      this.synchronizationSession.setUpCamera();
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
    // Effectivly surrenders projection control to main
    if (this.cameraControls) {
      this.cameraControls.enabled = false;
    }

    this.sender.sendSpectatingUpdate(this.isSynchronized, remoteUser.userId);
  }

  /**
   * Sets projection to the pre-synchronized state.
   */
  deactivate() {
    if (this.cameraControls) {
      this.cameraControls.enabled = true;
    }
    if (!this.main) return;
    this.localUser.camera.position.copy(this.synchronizationStartPosition);
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
