/* eslint-disable @typescript-eslint/adjacent-overload-signatures */
import Service, { inject as service } from '@ember/service';
import LocalUser from './local-user';
import CollaborationSession from './collaboration-session';
import SynchronizeService from 'virtual-reality/services/synchronize';
import * as THREE from 'three';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';

type Camera = {
  model: THREE.Object3D;
};

export default class SynchronizationSession extends Service {
  @service('local-user')
  private localUser!: LocalUser;

  @service('application-renderer')
  applicationRenderer!: ApplicationRenderer;

  @service('synchronize')
  private synchronizeService!: SynchronizeService;

  // Controlinstance of the connected devices
  private isMain!: boolean;

  lastPosition?: THREE.Vector3;

  // The id of the connected device
  private _deviceId!: number;
  position: THREE.Vector3 = new THREE.Vector3();
  quaternion: THREE.Quaternion = new THREE.Quaternion();

  set deviceId(n: number) {
    this._deviceId = n;
    this.isMain = n == 0;
  }

  get deviceId() {
    return this._deviceId;
  }

  /** MAIN CONFIGS */
  setCamera(c: Camera) {
    // For remote user names we should create another remoteUserGroup for synchronization to match names with deviceId.
    this.localUser.userName = this.isMain
      ? 'Main'
      : 'Projector ' + this._deviceId;

    // If position before tick is the same as now, we don't need to configure
    // if (this.lastPosition != c.model.position) {
    this.adapt(c, this._deviceId);
    // }
  }

  // To change specific projector adress id
  adapt(c: Camera, id: number) {
    const aspect = this.localUser.camera.aspect;
    const vFov = this.localUser.camera.fov;
    // Convert vertical FOV to radians
    const vFovrad = (vFov * Math.PI) / 180;
    // Calculate the horizontal FOV using trigonometry
    const hFov = 2 * Math.atan(Math.tan(vFovrad / 2) * aspect);
    const distance = Math.tan(hFov / 2);
    const mainPosition = c.model.position.clone();
    // Store the original position
    const originalPosition = new THREE.Vector3();
    c.model.getWorldPosition(originalPosition);
    // Create a vector representing the right direction
    const right = new THREE.Vector3(1, 0, 0);
    right.applyQuaternion(c.model.quaternion);
    // Calculate the new position by subtracting the shift to the right from the object's position
    const newPosition = new THREE.Vector3().subVectors(
      mainPosition,
      right.multiplyScalar(distance)
    );
    // Update the camera's position
    this.position.copy(newPosition);
    this.quaternion.copy(c.model.quaternion);
    // this.lastPosition = c.model.position;
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'synchronization-session': SynchronizationSession;
  }
}
