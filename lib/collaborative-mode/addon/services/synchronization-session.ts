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
  private _mainCamera!: Camera;

  // The id of the connected device
  private _deviceId!: number;
  private _position!: THREE.Vector3;
  private _quaternion!: THREE.Quaternion;

  private synchronized = false;

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
    this._mainCamera = c;
    this._mainPosition = c.model.position;
    this._mainQuaternion = c.model.quaternion;

    // For remote user names we should create another remoteUserGroup for synchronization to match names with deviceId.
    this.localUser.userName = this.isMain
      ? 'Main'
      : 'Projector ' + this._deviceId;

    // VERTICALLY SYNCHRONIZING
    this._position = new THREE.Object3D<Event>().position;
    this._position.x = this._mainPosition.x;
    this._position.y = this._mainPosition.y;
    this._position.z = this._mainPosition.z;

    this.quaternion = new THREE.Object3D<Event>().quaternion;
    this.quaternion.x = this._mainQuaternion.x;
    this.quaternion.y = this._mainQuaternion.y;
    this.quaternion.z = this._mainQuaternion.z;
    this.quaternion.w = this._mainQuaternion.w;

    this.twoDvertSync();
  }

  twoDvertSync() {
    if (this._deviceId == 1) {
      this._position.x = -0.7984811349679097;
    }

    if (this._deviceId == 2) {
      this._position.x = 0.8018120252990186;
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
function dVertSync() {
  throw new Error('Function not implemented.');
}
