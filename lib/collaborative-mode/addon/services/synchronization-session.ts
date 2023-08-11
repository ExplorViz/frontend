/* eslint-disable no-case-declarations */
import Service, { inject as service } from '@ember/service';
import LocalUser from './local-user';
import CollaborationSession from './collaboration-session';
import * as THREE from 'three';

export type ProjectorAngle = {
  left: number;
  right: number;
  up: number;
  down: number;
};

export type ProjectorAngles = {
  angles: ProjectorAngle[];
};

export type ProjectorQuaternions = {
  quaternions: THREE.Quaternion[];
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

  // TestUpload attribute
  numberDevices?: number;

  roomId?: string;

  // Things to consider:
  // 1) Tilt
  private tilt: number = 21;
  // 2) Circle position
  private circleRotation?: THREE.Euler;
  // 3) Order of Euler: 'ZYX' according to mpcdi-file

  setCount(n: number) {
    this.numberDevices = n;
    console.log(this.numberDevices);
  }

  setUp(rId: string, dId: number) {
    this.roomId = rId;
    this.deviceId = dId;
    this.isMain = this.deviceId === 0;
  }

  eulerToQuaternion(euler: THREE.Euler) {
    const quaternion = new THREE.Quaternion();
    quaternion.setFromEuler(euler);
    return quaternion;
  }

  /* Rotation by Camera: MPCDI
     Roll: X
     Pitch: Y
     Yaw: Z
  */
  setUpQuaternions(): ProjectorQuaternions {
    // Transform to radians
    const q0 = this.eulerToQuaternion(
      new THREE.Euler(
        -14.315 * THREE.MathUtils.DEG2RAD,
        24.45517 * THREE.MathUtils.DEG2RAD,
        37.73257 * THREE.MathUtils.DEG2RAD,
        'ZYX'
      )
    );

    const q1 = this.eulerToQuaternion(
      new THREE.Euler(
        16.31073 * THREE.MathUtils.DEG2RAD,
        27.50301 * THREE.MathUtils.DEG2RAD,
        -35.22566 * THREE.MathUtils.DEG2RAD,
        'ZYX'
      )
    );
    const q2 = this.eulerToQuaternion(
      new THREE.Euler(
        23.7238 * THREE.MathUtils.DEG2RAD,
        50.71501 * THREE.MathUtils.DEG2RAD,
        -118.98493 * THREE.MathUtils.DEG2RAD,
        'ZYX'
      )
    );
    const q3 = this.eulerToQuaternion(
      new THREE.Euler(
        -27.00377 * THREE.MathUtils.DEG2RAD,
        53.37216 * THREE.MathUtils.DEG2RAD,
        116.72392 * THREE.MathUtils.DEG2RAD,
        'ZYX'
      )
    );
    const q4 = this.eulerToQuaternion(
      new THREE.Euler(
        2.18843 * THREE.MathUtils.DEG2RAD,
        73.21593 * THREE.MathUtils.DEG2RAD,
        -9.4374 * THREE.MathUtils.DEG2RAD,
        'ZYX'
      )
    );

    return { quaternions: [q0, q1, q2, q3, q4] };
  }

  setUpFovAspectArr(): ProjectorAngles {
    const pA0: ProjectorAngle = {
      left: 62.0003,
      right: 62.0003,
      up: 49.6109237,
      down: 49.6109237,
    };

    const pA1: ProjectorAngle = {
      left: 62,
      right: 62,
      up: 49.61092,
      down: 49.61092,
    };

    const pA2: ProjectorAngle = {
      left: 62.0002972,
      right: 62.0002972,
      up: 49.6109237,
      down: 49.6109237,
    };

    const pA3: ProjectorAngle = {
      left: 62.0002972,
      right: 62.0002972,
      up: 49.6109237,
      down: 49.6109237,
    };

    const pA4: ProjectorAngle = {
      left: 62.0002972,
      right: 62.0002972,
      up: 49.6109237,
      down: 49.6109237,
    };

    return {
      angles: [pA0, pA1, pA2, pA3, pA4],
    };
  }

  /**
   * CALCULATE FOV AND ASPECT CONSIDERING PROJECTOR ANGLES
   */
  setUpFovAspect(projectorAngle: ProjectorAngle) {
    // tangents returns angle of given value in radians
    const tanLeft = Math.tan(THREE.MathUtils.degToRad(projectorAngle.left));
    const tanRight = Math.tan(THREE.MathUtils.degToRad(projectorAngle.right));
    const tanUp = Math.tan(THREE.MathUtils.degToRad(projectorAngle.up));
    const tanDown = Math.tan(THREE.MathUtils.degToRad(projectorAngle.down));

    // The total vertical field of view will be the sum of the up and down angles.
    // Since tan(θ) gives us the opposite/adjacent relationship in a right triangle,
    // we can use the arctangent function to retrieve the angle in radians and then convert it to degrees.
    const totalVerticalAngleRad = Math.atan(tanUp) + Math.atan(tanDown);
    const fov = THREE.MathUtils.radToDeg(totalVerticalAngleRad);
    this.localUser.camera.fov = fov;

    // The aspect ratio is the ratio of the width to the height of the frustum.
    // In terms of angles, this would be the ratio of the sum of the right and left angles to the sum of the up and down angles.
    const totalHorizontalAngleRad = Math.atan(tanRight) + Math.atan(tanLeft);
    const aspect = totalHorizontalAngleRad / totalVerticalAngleRad;
    this.localUser.camera.aspect = aspect;
    this.localUser.camera.updateProjectionMatrix();
  }

  // // Frustum calibration by considering near and projectorAngles
  // calculateFOVDirections(
  //   camera: THREE.PerspectiveCamera,
  //   projectorAngles: FovDirection
  // ): FovDirection {
  //   // Convert angles and compute tangent
  //   const tanLeft = Math.tan(THREE.MathUtils.degToRad(projectorAngles.left));
  //   const tanRight = Math.tan(THREE.MathUtils.degToRad(projectorAngles.right));
  //   const tanUp = Math.tan(THREE.MathUtils.degToRad(projectorAngles.up));
  //   const tanDown = Math.tan(THREE.MathUtils.degToRad(projectorAngles.down));

  //   const left = tanLeft * camera.near;
  //   const right = tanRight * camera.near;
  //   const up = tanUp * camera.near;
  //   const down = tanDown * camera.near;

  //   return { left, right, up, down };
  // }

  /** MAIN CONFIGS */
  // setUpCamera() {
  //   // Height of near near clipping plane
  //   // 2 * near * tan( ( fov * pi) / 360)
  //   // This equation derives from the definition of the tangent function and the properties of a right triangle.
  //   // Given the fov, we're effectively calculating the height of the opposite side of a right triangle
  //   // (i.e., the height of the viewing frustum at the near clip plane), using half of the fov since it spans both above and below the center line.
  //   // const height =
  //   //   2 *
  //   //   this.localUser.camera.near *
  //   //   Math.tan((this.localUser.camera.fov * Math.PI) / 360);
  //   // // width of the near clipping plane
  //   // const width = height * this.localUser.camera.aspect;
  //   // // const top = height / 2;
  //   // const top = 0;
  //   // const bottom = -height;
  //   // // const right = width / 2;
  //   // const right = 0;
  //   // const left = -width;
  //   // this.localUser.camera.setViewOffset(
  //   //   width * 4,
  //   //   height * 4,
  //   //   left,
  //   //   bottom,
  //   //   width,
  //   //   height
  //   // );
  //   // this.localUser.camera.updateProjectionMatrix();

  //   // console.log(mainProjectionMatrix);
  //   let fovDirections: FovDirection;
  //   const mainMatrix: THREE.Matrix4 = new THREE.Matrix4();
  //   switch (this.deviceId) {
  //     case 1: // bottom left
  //       // Starting again with camera
  //       // this.localUser.camera.updateProjectionMatrix();

  //       // // ###############################################################
  //       // fovDirections = this.calculateFOVDirections(
  //       //   this.localUser.camera,
  //       //   this.projectorAngle0
  //       // );

  //       // mainMatrix.copy(this.localUser.camera.projectionMatrix);

  //       // // ProjectionMatrix is overwritten by makePerspective and makeRotationFromEuler!
  //       // // Same effect as for monitor!
  //       // // const perspectiveMatrix =
  //       // mainMatrix.makePerspective(
  //       //   -fovDirections.left, // left
  //       //   fovDirections.right, // right
  //       //   fovDirections.up, // top
  //       //   -fovDirections.down, // bottom
  //       //   this.localUser.camera.near, // near
  //       //   this.localUser.camera.far // far
  //       // );

  //       // // Rotation on Matrix
  //       // // Hier fehlt noch tilt und die Berücksichtung der Kreisanordnung!
  //       // // Einfach tilt auf y in der const?
  //       // // Kreisanordung war über z?
  //       // // Überlegen, ob man nicht matrizen erstellt und diese miteinander verbindet?
  //       // // projectionmatrix von main nehmen und die Rotation und fov draufpacken?
  //       // // const rotationMatrix =
  //       // // mainMatrix.makeRotationFromEuler(
  //       // //   // new THREE.Euler(0, 90, 0)
  //       // //   // new THREE.Euler(0, 45, 0)
  //       // //   // new THREE.Euler(0, 0, 45) //
  //       // // );

  //       // // const multipliedMatrix = rotationMatrix.multiply(perspectiveMatrix);
  //       // this.localUser.camera.projectionMatrix.copy(mainMatrix);

  //       // // ###############################################################
  //       // // Rotation on Camera = Different effect than rotation on matrix!
  //       // this.setUpRotation(this.deviceId);

  //       // Working with main's projectionMatrix?
  //       // RemoteUser has only snapshot of projectionMatrix of the localUser!
  //       // this.localUser.camera.projectionMatrix.clone();
  //       break;

  //     case 2: // top left
  //       // ###############################################################
  //       // this.localUser.camera.updateProjectionMatrix();
  //       // fovDirections = this.calculateFOVDirections(
  //       //   this.localUser.camera,
  //       //   this.projectorAngle1
  //       // );

  //       // mainMatrix.copy(this.localUser.camera.projectionMatrix);

  //       // ProjectionMatrix is overwritten by makePerspective and makeRotationFromEuler!
  //       // Same effect as for monitor!
  //       // const perspectiveMatrix =
  //       // mainMatrix.makePerspective(
  //       //   -fovDirections.left, // left
  //       //   fovDirections.right, // right
  //       //   fovDirections.up, // top
  //       //   -fovDirections.down, // bottom
  //       //   this.localUser.camera.near, // near
  //       //   this.localUser.camera.far // far
  //       // );

  //       // // Rotation on Matrix
  //       // // Hier fehlt noch tilt und die Berücksichtung der Kreisanordnung!
  //       // // Einfach tilt auf y in der const?
  //       // // Kreisanordung war über z?
  //       // // Überlegen, ob man nicht matrizen erstellt und diese miteinander verbindet?
  //       // // projectionmatrix von main nehmen und die Rotation und fov draufpacken?
  //       // // const rotationMatrix =
  //       // // mainMatrix.makeRotationFromEuler(
  //       // //   // new THREE.Euler(0, 90, 0)
  //       // //   // new THREE.Euler(0, 45, 0)
  //       // //   // new THREE.Euler(0, 0, 45) //
  //       // // );

  //       // // const multipliedMatrix = rotationMatrix.multiply(perspectiveMatrix);
  //       this.localUser.camera.projectionMatrix.copy(mainMatrix);

  //       // // ###############################################################
  //       // // Rotation on Camera = Different effect than rotation on matrix!
  //       // this.setUpRotation(this.deviceId);

  //       // Working with main's projectionMatrix?
  //       // RemoteUser has only snapshot of projectionMatrix of the localUser!
  //       // this.localUser.camera.projectionMatrix.clone();
  //       break;
  //     case 3: // top right
  //       fovDirections = this.calculateFOVDirections(
  //         this.localUser.camera,
  //         this.projectorAngle234
  //       );

  //       // Hier fehlt noch tilt und die Berücksichtung der Kreisanordnung!
  //       // Einfach tilt auf y in der const?
  //       // Kreisanordung war über z?

  //       // Überlegen, ob man nicht matrizen erstellt und diese miteinander verbindet?

  //       // projectionmatrix von main nehmen und die Rotation und fov draufpacken?
  //       // -> Problem: Camera.model hat keine projectionMatrix!
  //       this.localUser.camera.projectionMatrix.makeRotationFromEuler(
  //         this.rotation2
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

  //       // Hier fehlt noch tilt und die Berücksichtung der Kreisanordnung!
  //       // Einfach tilt auf y in der const?
  //       // Kreisanordung war über z?
  //       // Überlegen, ob man nicht matrizen erstellt und diese miteinander verbindet?
  //       // projectionmatrix von main nehmen und die Rotation und fov draufpacken?
  //       this.localUser.camera.projectionMatrix.makeRotationFromEuler(
  //         this.rotation3
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
  //       // ###############################################################
  //       this.localUser.camera.updateProjectionMatrix();
  //       fovDirections = this.calculateFOVDirections(
  //         this.localUser.camera,
  //         this.projectorAngle234
  //       );

  //       mainMatrix.copy(this.localUser.camera.projectionMatrix);

  //       // console.log(fovDirections);
  //       // ProjectionMatrix is overwritten by makePerspective and makeRotationFromEuler!
  //       // Same effect as for monitor!
  //       // const perspectiveMatrix =
  //       mainMatrix.makePerspective(
  //         -fovDirections.left, // left
  //         fovDirections.right, // right
  //         // 0,
  //         fovDirections.up, // top
  //         -fovDirections.down, // bottom
  //         this.localUser.camera.near * 4, // near
  //         this.localUser.camera.far * 4 // far
  //       );

  //       // Rotation on Matrix
  //       // Hier fehlt noch tilt und die Berücksichtung der Kreisanordnung!
  //       // Einfach tilt auf y in der const?
  //       // Kreisanordung war über z?
  //       // Überlegen, ob man nicht matrizen erstellt und diese miteinander verbindet?
  //       // projectionmatrix von main nehmen und die Rotation und fov draufpacken?
  //       // const rotationMatrix =
  //       // mainMatrix.makeRotationFromEuler(
  //       //   // new THREE.Euler(45, 0, 0)
  //       //   // new THREE.Euler(0, 45, 0)
  //       //   // new THREE.Euler(0, 0, 45) //
  //       // );

  //       // const multipliedMatrix = rotationMatrix.multiply(perspectiveMatrix);
  //       // this.localUser.camera.projectionMatrix.multiply(multipliedMatrix);
  //       this.localUser.camera.projectionMatrix.copy(mainMatrix);

  //       // ###############################################################
  //       // Rotation on Camera = Different effect than rotation on matrix!
  //       // this.setUpRotation(this.deviceId);

  //       // Working with main's projectionMatrix?
  //       // RemoteUser has only snapshot of projectionMatrix of the localUser!
  //       // this.localUser.camera.projectionMatrix.clone();
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
