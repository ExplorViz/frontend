import Service, { inject as service } from '@ember/service';
import LocalUser from './local-user';

export default class SynchronizationSession extends Service {
  @service('local-user')
  private localUser!: LocalUser;

  // Controlinstance of the connected devices
  private isMain: boolean = false;

  // The id of the connected device
  deviceId!: number;

  // TestUpload attribute
  numberDevices?: number;

  roomId!: string;

  setCount(n: number) {
    this.numberDevices = n;
    console.log(this.numberDevices);
  }

  /** MAIN CONFIGS */
  setCamera() {
    this.isMain = this.deviceId === 0;

    // For remote user names we should create another remoteUserGroup for synchronization to match names with deviceId.
    this.localUser.userName = this.isMain
      ? 'Main'
      : 'Projector ' + this.deviceId;

    // translate pixel to radians and divide it by projector count (here 4)
    const tanFOV = Math.tan(((Math.PI / 180) * this.localUser.camera.fov) / 4);

    // Calculating height of near clipping plane, which is a plane perpendicular to the viewing direction,
    // and is used to help determine which parts of the landscape should be rendered and which should not.
    const height = tanFOV * this.localUser.camera.near;
    // The proportion of the camera's viewport
    const width = height * this.localUser.camera.aspect;

    /*
    left and right: horizontal FOV. 
    Negative values go to the left of the center of the screen, positive to the right.

    top and bottom: vertical FOV. 
    Positive values go up from the center of the screen, negative down.

    near and far: distances to the near and far clipping planes. 
    Only objects within this range will be rendered.
    -> Keep in mind: This will affect the visibility range of the object.
    -> Outside from near or far, there will be no rendering
    */
    switch (this.deviceId) {
      case 1: // bottom left
        this.localUser.camera.projectionMatrix.makePerspective(
          -width / 2, // left
          0, // right
          0, // top
          -height / 2, // bottom
          this.localUser.camera.near / 4, // near
          this.localUser.camera.far / 4 // far
        );
        break;
      case 2: // top left
        this.localUser.camera.projectionMatrix.makePerspective(
          -width / 2, // left
          0, // right
          height / 2, // top
          0, // bottom
          this.localUser.camera.near / 4, // near
          this.localUser.camera.far / 4 // far
        );
        break;
      case 3: // top right
        this.localUser.camera.projectionMatrix.makePerspective(
          0, // left
          width / 2, // right
          height / 2, // top
          0, // bottom
          this.localUser.camera.near / 4, // near
          this.localUser.camera.far / 4 // far
        );
        break;
      case 4: // bottom right
        this.localUser.camera.projectionMatrix.makePerspective(
          0, // left
          width / 2, // right
          0, // top
          -height / 2, // bottom
          this.localUser.camera.near / 4, // near
          this.localUser.camera.far / 4 // far
        );
        break;
      case 5: //middle
        this.localUser.camera.projectionMatrix.makePerspective(
          -width / 2, // left
          width / 2, // right
          height / 2, // top
          -height / 2, // bottom
          this.localUser.camera.near / 4, // near
          this.localUser.camera.far / 4 // far
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
