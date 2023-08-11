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

  readonly rotation0 = new THREE.Euler(
    -14.315,
    24.45517 + this.tilt,
    37.73257,
    'ZYX'
  );
  readonly rotation1 = new THREE.Euler(
    16.31073,
    27.50301 + this.tilt,
    -35.22566,
    'ZYX'
  );
  readonly rotation2 = new THREE.Euler(
    23.7238,
    50.71501 + this.tilt,
    -118.98493,
    'ZYX'
  );
  readonly rotation3 = new THREE.Euler(
    -27.00377,
    53.37216 + this.tilt,
    116.72392,
    'ZYX'
  );
  readonly rotation4 = new THREE.Euler(
    2.18843,
    73.21593 + this.tilt,
    -9.4374,
    'ZYX'
  );

  setCount(n: number) {
    this.numberDevices = n;
    console.log(this.numberDevices);
  }

  setUp(rId: string, dId: number) {
    this.roomId = rId;
    this.deviceId = dId;
    this.isMain = this.deviceId === 0;
  }

  /* Rotation by Camera
    Roll: X
    Pitch: Y
    Yaw: Z
  */
  setUpRotation(dId: number) {
    switch (dId) {
      case 1:
        this.localUser.camera.quaternion.multiply(
          new THREE.Quaternion(
            THREE.MathUtils.degToRad(this.rotation0.x),
            THREE.MathUtils.degToRad(this.rotation0.y + this.tilt),
            THREE.MathUtils.degToRad(this.rotation0.z)
          )
        );
        break;

      case 2:
        this.localUser.camera.quaternion.multiply(
          new THREE.Quaternion(
            THREE.MathUtils.degToRad(this.rotation1.x),
            THREE.MathUtils.degToRad(this.rotation1.y + this.tilt),
            THREE.MathUtils.degToRad(this.rotation1.z)
          )
        );
        break;

      case 3:
        this.localUser.camera.quaternion.multiply(
          new THREE.Quaternion(
            THREE.MathUtils.degToRad(this.rotation2.x),
            THREE.MathUtils.degToRad(this.rotation2.y + this.tilt),
            THREE.MathUtils.degToRad(this.rotation2.z)
          )
        );
        break;

      case 4:
        this.localUser.camera.quaternion.multiply(
          new THREE.Quaternion(
            THREE.MathUtils.degToRad(this.rotation3.x),
            THREE.MathUtils.degToRad(this.rotation3.y + this.tilt),
            THREE.MathUtils.degToRad(this.rotation3.z)
          )
        );
        break;

      case 5:
        this.localUser.camera.quaternion.multiply(
          new THREE.Quaternion(
            THREE.MathUtils.degToRad(this.rotation4.x),
            THREE.MathUtils.degToRad(this.rotation4.y + this.tilt),
            THREE.MathUtils.degToRad(this.rotation4.z)
          )
        );
        break;
    }
    this.localUser.camera.updateProjectionMatrix();
  }

  // Frustum calibration by considering near and projectorAngles
  calculateFOVDirections(
    camera: THREE.PerspectiveCamera,
    projectorAngles: FovDirection
  ): FovDirection {
    // Convert angles and compute tangent
    const tanLeft = Math.tan(THREE.MathUtils.degToRad(projectorAngles.left));
    const tanRight = Math.tan(THREE.MathUtils.degToRad(projectorAngles.right));
    const tanUp = Math.tan(THREE.MathUtils.degToRad(projectorAngles.up));
    const tanDown = Math.tan(THREE.MathUtils.degToRad(projectorAngles.down));

    const left = tanLeft * camera.near;
    const right = tanRight * camera.near;
    const up = tanUp * camera.near;
    const down = tanDown * camera.near;

    return { left, right, up, down };
  }

  /** MAIN CONFIGS */
  setUpCamera() {
    // Height of near near clipping plane
    // 2 * near * tan( ( fov * pi) / 360)
    // This equation derives from the definition of the tangent function and the properties of a right triangle.
    // Given the fov, we're effectively calculating the height of the opposite side of a right triangle
    // (i.e., the height of the viewing frustum at the near clip plane), using half of the fov since it spans both above and below the center line.
    // const height =
    //   2 *
    //   this.localUser.camera.near *
    //   Math.tan((this.localUser.camera.fov * Math.PI) / 360);
    // // width of the near clipping plane
    // const width = height * this.localUser.camera.aspect;
    // // const top = height / 2;
    // const top = 0;
    // const bottom = -height;
    // // const right = width / 2;
    // const right = 0;
    // const left = -width;
    // this.localUser.camera.setViewOffset(
    //   width * 4,
    //   height * 4,
    //   left,
    //   bottom,
    //   width,
    //   height
    // );
    // this.localUser.camera.updateProjectionMatrix();

    // console.log(mainProjectionMatrix);
    let fovDirections: FovDirection;
    let mainMatrix: THREE.Matrix4 = new THREE.Matrix4();
    switch (this.deviceId) {
      case 1: // bottom left

      // ############################################################### 
      this.localUser.camera.updateProjectionMatrix();
      fovDirections = this.calculateFOVDirections(
          this.localUser.camera,
          this.projectorAngle0
        );

        mainMatrix.copy(this.localUser.camera.projectionMatrix);

        // console.log(fovDirections);
        // ProjectionMatrix is overwritten by makePerspective and makeRotationFromEuler!
        // Same effect as for monitor!
        // const perspectiveMatrix =
          mainMatrix.makePerspective(
            -fovDirections.left, // left
            fovDirections.right, // right
            // 0,
            // fovDirections.up, // top
            0,
            -fovDirections.down * 2, // bottom
            this.localUser.camera.near, // near
            this.localUser.camera.far // far
          );

        // Rotation on Matrix
        // Hier fehlt noch tilt und die Berücksichtung der Kreisanordnung!
        // Einfach tilt auf y in der const?
        // Kreisanordung war über z?
        // Überlegen, ob man nicht matrizen erstellt und diese miteinander verbindet?
        // projectionmatrix von main nehmen und die Rotation und fov draufpacken?
        // const rotationMatrix =
          mainMatrix.makeRotationFromEuler(
            // new THREE.Euler(45, 0, 0)
            // new THREE.Euler(0, 45, 0)
            new THREE.Euler(0, 0, 45) // 
          );

        // const multipliedMatrix = rotationMatrix.multiply(perspectiveMatrix);
        // this.localUser.camera.projectionMatrix.multiply(multipliedMatrix);
        this.localUser.camera.projectionMatrix.copy(mainMatrix);
          
        // ############################################################### 
        // Rotation on Camera = Different effect than rotation on matrix!
        // this.setUpRotation(this.deviceId);

        // Working with main's projectionMatrix?
        // RemoteUser has only snapshot of projectionMatrix of the localUser!
        // this.localUser.camera.projectionMatrix.clone();
        break;

      case 2: // top left
        fovDirections = this.calculateFOVDirections(
          this.localUser.camera,
          this.projectorAngle1
        );

        // Hier fehlt noch tilt und die Berücksichtung der Kreisanordnung!
        // Einfach tilt auf y in der const?
        // Kreisanordung war über z?
        // Überlegen, ob man nicht matrizen erstellt und diese miteinander verbindet?
        // projectionmatrix von main nehmen und die Rotation und fov draufpacken?
        this.localUser.camera.projectionMatrix.makeRotationFromEuler(
          this.rotation1
        );

        this.localUser.camera.projectionMatrix.makePerspective(
          fovDirections.left, // left
          fovDirections.right, // right
          fovDirections.up, // top
          fovDirections.down, // bottom
          this.localUser.camera.near, // near
          this.localUser.camera.far // far
        );
        break;
      case 3: // top right
        fovDirections = this.calculateFOVDirections(
          this.localUser.camera,
          this.projectorAngle234
        );

        // Hier fehlt noch tilt und die Berücksichtung der Kreisanordnung!
        // Einfach tilt auf y in der const?
        // Kreisanordung war über z?

        // Überlegen, ob man nicht matrizen erstellt und diese miteinander verbindet?

        // projectionmatrix von main nehmen und die Rotation und fov draufpacken?
        // -> Problem: Camera.model hat keine projectionMatrix!
        this.localUser.camera.projectionMatrix.makeRotationFromEuler(
          this.rotation2
        );
        this.localUser.camera.projectionMatrix.makePerspective(
          fovDirections.left, // left
          fovDirections.right, // right
          fovDirections.up, // top
          fovDirections.down, // bottom
          this.localUser.camera.near, // near
          this.localUser.camera.far // far
        );
        break;
      case 4: // bottom right
        fovDirections = this.calculateFOVDirections(
          this.localUser.camera,
          this.projectorAngle234
        );

        // Hier fehlt noch tilt und die Berücksichtung der Kreisanordnung!
        // Einfach tilt auf y in der const?
        // Kreisanordung war über z?
        // Überlegen, ob man nicht matrizen erstellt und diese miteinander verbindet?
        // projectionmatrix von main nehmen und die Rotation und fov draufpacken?
        this.localUser.camera.projectionMatrix.makeRotationFromEuler(
          this.rotation3
        );
        this.localUser.camera.projectionMatrix.makePerspective(
          fovDirections.left, // left
          fovDirections.right, // right
          fovDirections.up, // top
          fovDirections.down, // bottom
          this.localUser.camera.near, // near
          this.localUser.camera.far // far
        );
        break;
      case 5: //middle
        fovDirections = this.calculateFOVDirections(
          this.localUser.camera,
          this.projectorAngle234
        );

        // Hier fehlt noch tilt und die Berücksichtung der Kreisanordnung!
        // Einfach tilt auf y in der const?
        // Kreisanordung war über z?
        // Überlegen, ob man nicht matrizen erstellt und diese miteinander verbindet?
        // projectionmatrix von main nehmen und die Rotation und fov draufpacken?
        this.localUser.camera.projectionMatrix.makeRotationFromEuler(
          this.rotation4
        );
        this.localUser.camera.projectionMatrix.makePerspective(
          fovDirections.left, // left
          fovDirections.right, // right
          fovDirections.up, // top
          fovDirections.down, // bottom
          this.localUser.camera.near, // near
          this.localUser.camera.far // far
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
