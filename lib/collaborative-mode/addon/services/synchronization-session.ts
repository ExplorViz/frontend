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

    this.localUser.camera.projectionMatrix.elements[8] =
      this.deviceId === 1 ? -1 : 1;
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'synchronization-session': SynchronizationSession;
  }
}
