/* eslint-disable no-case-declarations */
import Service, { inject as service } from '@ember/service';
import LocalUser from './local-user';
import CollaborationSession from './collaboration-session';
import * as THREE from 'three';

type FovDirection = {
  left: number;
  right: number;
  up: number;
  down: number;
};

export default class SynchronizationSession extends Service {
  @service('local-user')
  private localUser!: LocalUser;

  @service('collaboration-session')
  collaborationSession!: CollaborationSession;

  // Controlinstance of the connected devices
  private isMain: boolean = false;

  // The id of the connected device
  deviceId!: number;

  private tilt: number = 21;

  private readonly projectorAngle0: FovDirection = {
    left: 62.0003,
    right: 62.0003,
    up: 49.6109237,
    down: 49.6109237,
  };

  private readonly projectorAngle1: FovDirection = {
    left: 62,
    right: 62,
    up: 49.61092,
    down: 49.61092,
  };

  private readonly projectorAngle234: FovDirection = {
    left: 62.0002972,
    right: 62.0002972,
    up: 49.6109237,
    down: 49.6109237,
  };

  // TestUpload attribute
  numberDevices?: number;

  roomId?: string;

  readonly rotation0 = new THREE.Euler(-14.315, 24.45517, 37.73257, 'ZYX');
  readonly rotation1 = new THREE.Euler(16.31073, 27.50301, -35.22566, 'ZYX');
  readonly rotation2 = new THREE.Euler(23.7238, 50.71501, -118.98493, 'ZYX');
  readonly rotation3 = new THREE.Euler(-27.00377, 53.37216, 116.72392, 'ZYX');
  readonly rotation4 = new THREE.Euler(2.18843, 73.21593, -9.4374, 'ZYX');

  setCount(n: number) {
    this.numberDevices = n;
    console.log(this.numberDevices);
  }

  setUp(rId: string, dId: number) {
    this.roomId = rId;
    this.deviceId = dId;
    this.isMain = this.deviceId === 0;
  }

  degToRad = (degrees: number) => degrees * (Math.PI / 180);

  /*
    Roll: X
    Pitch: Y
    Yaw: Z
  */
  setUpRotation(dId: number) {
    switch (dId) {
      case 1:
        this.localUser.camera.quaternion.multiply(
          new THREE.Quaternion(
            this.degToRad(this.rotation0.x),
            this.degToRad(this.rotation0.y + this.tilt),
            this.degToRad(this.rotation0.z)
          )
        );
        break;

      case 2:
        this.localUser.camera.quaternion.multiply(
          new THREE.Quaternion(
            this.degToRad(this.rotation1.x),
            this.degToRad(this.rotation1.y + this.tilt),
            this.degToRad(this.rotation1.z)
          )
        );
        break;

      case 3:
        this.localUser.camera.quaternion.multiply(
          new THREE.Quaternion(
            this.degToRad(this.rotation2.x),
            this.degToRad(this.rotation2.y + this.tilt),
            this.degToRad(this.rotation2.z)
          )
        );
        break;

      case 4:
        this.localUser.camera.quaternion.multiply(
          new THREE.Quaternion(
            this.degToRad(this.rotation3.x),
            this.degToRad(this.rotation3.y + this.tilt),
            this.degToRad(this.rotation3.z)
          )
        );
        break;

      case 5:
        this.localUser.camera.quaternion.multiply(
          new THREE.Quaternion(
            this.degToRad(this.rotation4.x),
            this.degToRad(this.rotation4.y + this.tilt),
            this.degToRad(this.rotation4.z)
          )
        );
        break;
    }
    this.localUser.camera.updateProjectionMatrix();
  }

  calculateFOVDirections(
    camera: THREE.PerspectiveCamera,
    projectorAngles: FovDirection
  ): FovDirection {
    const tanLeft = Math.tan(this.degToRad(projectorAngles.left));
    const tanRight = Math.tan(this.degToRad(projectorAngles.right));
    const tanUp = Math.tan(this.degToRad(projectorAngles.up));
    const tanDown = Math.tan(this.degToRad(projectorAngles.down));

    const left = tanLeft * camera.near;
    const right = tanRight * camera.near;
    const up = tanUp * camera.near;
    const down = tanDown * camera.near;

    return { left, right, up, down };
  }

  /** MAIN CONFIGS */
  setCamera() {
    // // translate pixel to radians and divide it by projector count (here 4)
    // const tanFOV = Math.tan(((Math.PI / 180) * this.localUser.camera.fov) / 4);

    // // Calculating height of near clipping plane, which is a plane perpendicular to the viewing direction,
    // // and is used to help determine which parts of the landscape should be rendered and which should not.
    // const height = tanFOV * this.localUser.camera.near;
    // // The proportion of the camera's viewport
    // const width = height * this.localUser.camera.aspect;

    // Height of near near clipping plane
    // 2 * near * tan( ( fov * pi) / 360)
    // This equation derives from the definition of the tangent function and the properties of a right triangle.
    // Given the fov, we're effectively calculating the height of the opposite side of a right triangle
    // (i.e., the height of the viewing frustum at the near clip plane), using half of the fov since it spans both above and below the center line.
    const height =
      2 *
      this.localUser.camera.near *
      Math.tan((this.localUser.camera.fov * Math.PI) / 360);

    // width of the near clipping plane
    const width = height * this.localUser.camera.aspect;

    // const top = height / 2;
    const top = 0;
    const bottom = -height;
    // const right = width / 2;
    const right = 0;
    const left = -width;

    this.localUser.camera.setViewOffset(
      width * 4,
      height * 4,
      left,
      bottom,
      width,
      height
    );
    // this.localUser.camera.updateProjectionMatrix();

    /* Pyramid of camera. */
    //   switch (this.deviceId) {
    //     case 1: // bottom left
    // this.localUser.camera.projectionMatrix.makePerspective(
    //   -width / 2, // left
    //   0, // right
    //   0, // top
    //   -height / 2, // bottom
    //   this.localUser.camera.near / 4, // near
    //   this.localUser.camera.far / 4 // far
    // );
    //       break;
    //     case 2: // top left
    //       this.localUser.camera.projectionMatrix.makePerspective(
    //         -width / 2, // left
    //         0, // right
    //         height / 2, // top
    //         0, // bottom
    //         this.localUser.camera.near / 4, // near
    //         this.localUser.camera.far / 4 // far
    //       );
    //       break;
    //     case 3: // top right
    //       this.localUser.camera.projectionMatrix.makePerspective(
    //         0, // left
    //         width / 2, // right
    //         height / 2, // top
    //         0, // bottom
    //         this.localUser.camera.near / 4, // near
    //         this.localUser.camera.far / 4 // far
    //       );
    //       break;
    //     case 4: // bottom right
    //       this.localUser.camera.projectionMatrix.makePerspective(
    //         0, // left
    //         width / 2, // right
    //         0, // top
    //         -height / 2, // bottom
    //         this.localUser.camera.near / 4, // near
    //         this.localUser.camera.far / 4 // far
    //       );
    //       break;
    //     case 5: //middle
    //       this.localUser.camera.projectionMatrix.makePerspective(
    //         -width / 2, // left
    //         width / 2, // right
    //         height / 2, // top
    //         -height / 2, // bottom
    //         this.localUser.camera.near / 4, // near
    //         this.localUser.camera.far / 4 // far
    //       );
    //       break;
    //     default:
    //       break;
    //   }
  }
  //   let fovDirections: FovDirection;
  //   switch (this.deviceId) {
  //     case 1: // bottom left
  //       fovDirections = this.calculateFOVDirections(
  //         this.localUser.camera,
  //         this.projectorAngle0
  //       );
  //       this.localUser.camera.projectionMatrix.makePerspective(
  //         fovDirections.left, // left
  //         fovDirections.right, // right
  //         fovDirections.up, // top
  //         fovDirections.down, // bottom
  //         this.localUser.camera.near, // near
  //         this.localUser.camera.far // far
  //       );
  //       break;

  //     case 2: // top left
  //       fovDirections = this.calculateFOVDirections(
  //         this.localUser.camera,
  //         this.projectorAngle1
  //       );
  //       this.localUser.camera.projectionMatrix.makePerspective(
  //         fovDirections.left, // left
  //         fovDirections.right, // right
  //         fovDirections.up, // top
  //         fovDirections.down, // bottom
  //         this.localUser.camera.near, // near
  //         this.localUser.camera.far // far
  //       );

  //       break;
  //     case 3: // top right
  //       fovDirections = this.calculateFOVDirections(
  //         this.localUser.camera,
  //         this.projectorAngle234
  //       );
  //       this.localUser.camera.projectionMatrix.makePerspective(
  //         fovDirections.left, // left
  //         fovDirections.right, // right
  //         fovDirections.up, // top
  //         fovDirections.down, // bottom
  //         this.localUser.camera.near, // near
  //         this.localUser.camera.far // far
  //       );

  //       break;
  //     case 4: // bottom right
  //       fovDirections = this.calculateFOVDirections(
  //         this.localUser.camera,
  //         this.projectorAngle234
  //       );
  //       this.localUser.camera.projectionMatrix.makePerspective(
  //         fovDirections.left, // left
  //         fovDirections.right, // right
  //         fovDirections.up, // top
  //         fovDirections.down, // bottom
  //         this.localUser.camera.near, // near
  //         this.localUser.camera.far // far
  //       );
  //       break;
  //     case 5: //middle
  //       fovDirections = this.calculateFOVDirections(
  //         this.localUser.camera,
  //         this.projectorAngle234
  //       );
  //       this.localUser.camera.projectionMatrix.makePerspective(
  //         fovDirections.left, // left
  //         fovDirections.right, // right
  //         fovDirections.up, // top
  //         fovDirections.down, // bottom
  //         this.localUser.camera.near, // near
  //         this.localUser.camera.far // far
  //       );
  //       break;
  //     default:
  //       break;
  //   }
  // }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'synchronization-session': SynchronizationSession;
  }
}
