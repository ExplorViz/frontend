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

    const tanFOV = Math.tan(((Math.PI / 180) * this.localUser.camera.fov) / 2);
    const height = tanFOV * this.localUser.camera.near;
    const width = height * this.localUser.camera.aspect;

    switch (this.deviceId) {
      case 1: // bottom left
        this.localUser.camera.projectionMatrix.makePerspective(
          -width / 2, // left
          0, // right
          0, // top
          -height / 2, // bottom
          this.localUser.camera.near / 4,
          this.localUser.camera.far / 4
        );
        break;
      case 2: // top left
        this.localUser.camera.projectionMatrix.makePerspective(
          -width / 2, // left
          0, // right
          height / 2, // top
          0, // bottom
          this.localUser.camera.near / 4,
          this.localUser.camera.far / 4
        );
        break;
      case 3: // top right
        this.localUser.camera.projectionMatrix.makePerspective(
          0, // left
          width / 2, // right
          height / 2, // top
          0, // bottom
          this.localUser.camera.near / 4,
          this.localUser.camera.far / 4
        );
        break;
      case 4: // bottom right
        this.localUser.camera.projectionMatrix.makePerspective(
          0, // left
          width / 2, // right
          0, // top
          -height / 2, // bottom
          this.localUser.camera.near / 4,
          this.localUser.camera.far / 4
        );
        break;
      case 5: //middle
        this.localUser.camera.projectionMatrix.makePerspective(
          -width / 2, // left
          width / 2, // right
          height / 2, // top
          -height / 2, // bottom
          this.localUser.camera.near / 4,
          this.localUser.camera.far / 4
        );
        break;
      default:
        break;
    }
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'synchronization-session': SynchronizationSession;
  }
}
