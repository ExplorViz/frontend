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
  position!: THREE.Vector3;
  quaternion!: THREE.Quaternion;

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

    const rightSight = new THREE.Vector3(1, 0, 0).applyQuaternion(
      c.model.quaternion
    );

    // Convert vertical FOV to radians
    const vFovrad = (vFov * Math.PI) / 180;

    // Calculate the horizontal FOV using trigonometry
    const hFov = 2 * Math.atan(Math.tan(vFovrad / 2) * aspect);
    const distance = Math.tan(hFov / 2);

    this.position = c.model.position
      .clone()
      .add(rightSight.multiplyScalar(distance));

    this.quaternion = c.model.quaternion;

    // this.lastPosition = c.model.position;
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'synchronization-session': SynchronizationSession;
  }
}
