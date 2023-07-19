import Service, { inject as service } from '@ember/service';
import LocalUser from './local-user';
import * as THREE from 'three';

export default class SynchronizationSession extends Service {
  @service('local-user')
  private localUser!: LocalUser;

  // Controlinstance of the connected devices
  private isMain: boolean = false;

  // The id of the connected device
  deviceId!: number;

  /** MAIN CONFIGS */
  setCamera() {
    this.isMain = this.deviceId === 0;

    // For remote user names we should create another remoteUserGroup for synchronization to match names with deviceId.
    this.localUser.userName = this.isMain
      ? 'Main'
      : 'Projector ' + this.deviceId;

    // this.localUser.camera.projectionMatrix.elements[8] =
    //   this.deviceId === 1 ? -1 : 1;

    this.localUser.camera.projectionMatrix.elements[8] = -1;

    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();

    // Assume matrix has been previously set
    this.localUser.camera.projectionMatrix.decompose(
      position,
      quaternion,
      scale
    );

    this.localUser.camera.position.copy(position);
    this.localUser.camera.quaternion.copy(quaternion);
    this.localUser.camera.scale.copy(scale);

    // this.localUser.camera.projectionMatrix.elements[7] = 1;

    // this.localUser.camera.projectionMatrix.makePerspective(
    //   -window.innerWidth / 4, // left
    //   window.innerWidth / 4, // right
    //   window.innerHeight / 2, // top
    //   0, // bottom
    //   this.localUser.camera.near,
    //   this.localUser.camera.far
    // );
    // this.localUser.camera.updateProjectionMatrix();
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'synchronization-session': SynchronizationSession;
  }
}
