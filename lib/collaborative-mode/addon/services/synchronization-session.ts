import Service, { inject as service } from '@ember/service';
import LocalUser from './local-user';

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

    const tanFOV = Math.tan(((Math.PI / 180) * this.localUser.camera.fov) / 2);
    const height = tanFOV * this.localUser.camera.near;
    const width = height * this.localUser.camera.aspect;
    const temp = JSON.parse(
      JSON.stringify(this.localUser.camera.projectionMatrix)
    );
    console.log(temp);
    this.localUser.camera.projectionMatrix.makePerspective(
      -width / 2, // left
      0, // right
      height / 2, // top
      0, // bottom
      this.localUser.camera.near,
      this.localUser.camera.far
    );
    console.log(this.localUser.camera.projectionMatrix);
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'synchronization-session': SynchronizationSession;
  }
}
