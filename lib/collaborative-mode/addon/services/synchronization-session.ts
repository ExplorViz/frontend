/* eslint-disable @typescript-eslint/adjacent-overload-signatures */
import Service, { inject as service } from '@ember/service';
import LocalUser from './local-user';
import CollaborationSession from './collaboration-session';
import SynchronizeService from 'virtual-reality/services/synchronize';
import * as THREE from 'three';

type Camera = {
  model: THREE.Object3D;
};

export default class SynchronizationSession extends Service {
  @service('local-user')
  private localUser!: LocalUser;

  @service('collaboration-session')
  private collaborationSession!: CollaborationSession;

  @service('synchronize')
  private synchronizeService!: SynchronizeService;

  // Controlinstance of the connected devices
  private isMain!: boolean;
  _mainPosition!: THREE.Vector3;
  _mainQuaternion!: THREE.Quaternion;

  // The id of the connected device
  private _deviceId!: number;
  private _position!: THREE.Vector3;
  private _quaternion!: THREE.Quaternion;

  set deviceId(n: number) {
    this._deviceId = n;
    this.isMain = n == 0;
  }

  get deviceId() {
    return this._deviceId;
  }

  /** SYNCHRONIZATION DEVICE CONFIGS  */
  set position(p: THREE.Vector3) {
    this._position = p;
  }

  set quaternion(q: THREE.Quaternion) {
    this._quaternion = q;
  }

  get position() {
    return this._position;
  }

  get quaternion() {
    return this._quaternion;
  }

  /** MAIN CONFIGS */
  set mainCamera(c: Camera) {
    this._mainPosition = c.model.position;
    this._mainQuaternion = c.model.quaternion;

    // For remote user names we should create another remoteUserGroup for synchronization to match names with deviceId.
    this.localUser.userName = this.isMain
      ? 'Main'
      : 'Projector ' + this._deviceId;

    // VERTICALLY SYNCHRONIZING
    this._position = c.model.position;
    this._quaternion = c.model.quaternion;

    this.twoDvertSync(c);
  }

  twoDvertSync(c: Camera) {
    ///// Calculate horizontal FOV /////
    // Convert vertical FOV to radians
    const vFOVrad = (this.localUser.camera.fov * Math.PI) / 180;

    // Calculate the horizontal FOV using trigonometry
    const hFOV =
      2 * Math.atan(Math.tan(vFOVrad / 2) * this.localUser.camera.aspect);

    // Convert horizontal FOV back to degrees
    const hFOVdeg = (hFOV * 180) / Math.PI;

    const up = new THREE.Vector3(0, 1, 0); // Or your scene's up direction

    if (this._deviceId == 1) {
      const leftVector = new THREE.Vector3(-1, 0, 0).applyQuaternion(
        this._mainQuaternion
      );

      this._position = this._mainPosition
        .clone()
        .add(leftVector.multiplyScalar(1.6)); // 0.8 is the x-distance between the two cameras

      console.log('Position', this._position);
      console.log('Quaternion', this._quaternion);

      // this._position.x = -0.7984811349679097;
    }

    if (this._deviceId == 2) {
      const testQuaternion = this._mainQuaternion.clone();

      const rightVector = new THREE.Vector3(1, 0, 0).applyQuaternion(
        testQuaternion
      );

      this._position = this._mainPosition
        .clone()
        .add(rightVector.multiplyScalar(1.6));

      console.log('Position', this._position);
      console.log('Quaternion', this._quaternion);

      // this._position.x = 0.8018120252990186;
    }
  }

  // set mainPosition(p : THREE.Vector3) {
  //   this._mainPosition = p;
  //   this._position = this._mainPosition;
  // }

  // set mainQuaternion(q : THREE.Quaternion) {
  //   this._mainQuaternion = q;
  //   this._quaternion = this._mainQuaternion;
  // }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'synchronization-session': SynchronizationSession;
  }
}
