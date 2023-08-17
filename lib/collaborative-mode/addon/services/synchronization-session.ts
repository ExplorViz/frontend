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

  // The id of the connected device
  deviceId!: number;

  roomId!: string;

  // TestUpload attribute
  numberDevices?: number;

  // FOV
  private verticalAngleRad!: number;
  private horizontalAngleRad!: number;

  // Aspect
  private aspect!: number;

  private angle?: ProjectorAngle;
  private quaternion?: THREE.Quaternion;

  // Things to consider:
  // 1) Tilt
  private tilt: number = 21;
  // 2) Circle position
  private circleRotation?: THREE.Euler;
  // 3) Order of Euler: 'ZYX' according to mpcdi-file
  // 4) Fullscreen

  setCount(n: number) {
    this.numberDevices = n;
    console.log(this.numberDevices);
  }

  setUpIds(dId: number, rId: string) {
    this.deviceId = dId;
    this.roomId = rId;
    // this.localUser.userId = uId;
    this.localUser.userName = dId === 0 ? 'Main' : 'Projector ' + dId;
  }

  setUpDeviceId(dId: number) {
    this.deviceId = dId;
    // this.localUser.userId = uId;
    this.localUser.userName = dId === 0 ? 'Main' : 'Projector ' + dId;
  }

  setUpRoomId(rId: string) {
    this.roomId = rId;
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
  setUpQuaternionArr(): ProjectorQuaternions {
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

  setUpAngleArr(): ProjectorAngles {
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
  setUpVerticalFov(projectorAngle: ProjectorAngle) {
    // tangents returns angle of given value in radians
    const tanUp = Math.tan(THREE.MathUtils.degToRad(projectorAngle.up));
    const tanDown = Math.tan(THREE.MathUtils.degToRad(projectorAngle.down));

    // The total vertical field of view will be the sum of the up and down angles.
    // Since tan(θ) gives us the opposite/adjacent relationship in a right triangle,
    // we can use the arctangent function to retrieve the angle in radians and then convert it to degrees.
    this.verticalAngleRad = Math.atan(tanUp) + Math.atan(tanDown);
    // Perspective Camera uses degree
    const projectorVerticalAngleDeg = THREE.MathUtils.radToDeg(
      this.verticalAngleRad
    );

    this.localUser.camera.fov = projectorVerticalAngleDeg;
    this.localUser.camera.updateProjectionMatrix();
  }

  setUpAspect(projectorAngle: ProjectorAngle) {
    // tangents returns angle of given value in radians
    const tanLeft = Math.tan(THREE.MathUtils.degToRad(projectorAngle.left));
    const tanRight = Math.tan(THREE.MathUtils.degToRad(projectorAngle.right));

    // The aspect ratio is the ratio of the width to the height of the frustum.
    // In terms of angles, this would be the ratio of the sum of the right and left angles to the sum of the up and down angles.
    this.horizontalAngleRad = Math.atan(tanRight) + Math.atan(tanLeft);
    this.aspect = this.horizontalAngleRad / this.verticalAngleRad;

    this.localUser.camera.aspect = this.aspect;
    this.localUser.camera.updateProjectionMatrix();
  }

  setUpCamera(projectorAngle: ProjectorAngle) {
    this.setUpVerticalFov(projectorAngle);
    this.setUpAspect(projectorAngle);
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'synchronization-session': SynchronizationSession;
  }
}
