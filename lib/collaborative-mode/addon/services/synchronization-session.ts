import Service, { inject as service } from '@ember/service';
import LocalUser from './local-user';
import CollaborationSession from './collaboration-session';
import * as THREE from 'three';
import { DEG2RAD, RAD2DEG } from 'three/src/math/MathUtils';

export type YawPitchRoll = {
  yaw: number;
  pitch: number;
  roll: number;
};

export type ProjectorQuaternion = {
  quaternion: THREE.Quaternion;
};

export type ProjectorAngles = {
  left: number;
  right: number;
  up: number;
  down: number;
};

export type ProjectorConfigurations = {
  id: string;
  yawPitchRoll: YawPitchRoll;
  projectorAngles: ProjectorAngles;
};

export type ProjectorAngles2 = {
  angles: ProjectorAngles[];
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

  // FOV
  private verticalAngleRad!: number;
  private horizontalAngleRad!: number;

  // Aspect
  private aspect!: number;

  projectorAngles!: ProjectorAngles;
  projectorQuaternion!: ProjectorQuaternion;

  // domeTilt for moving the projection into center of dome
  private domeTilt: number = 21;

  getDomeTiltQuaternion() {
    // 360° whole globe, 180° half globe after horizontal cut, 90° half of half globe with vertical cut.
    // Horizontal cut, then vertical cut of half globe = angle from border to dometop center
    const shiftedAngle = ((360 / 2) / 2) - this.domeTilt;

    // after setting up rotation axes via synchronisation, 
    // we can use positive pitch to shift synchronized projection to the center of the globe.
    const domeTiltQuaternion = new THREE.Quaternion(0, 0, 0, 0).setFromAxisAngle(
      new THREE.Vector3(1, 0, 0),
      shiftedAngle * THREE.MathUtils.DEG2RAD
    );

    return domeTiltQuaternion;
  }

  /* Sets up important Ids: Essentially manages and starts synchronization behaviour
  1) deviceId: Detection of device to request correct (a) projector angle and (b) yaw/pitch/roll angles.
  2) roomId: Sets the room name to this and impacts which room is hosted or joined by synchronization user.
  3) userId & userName: Sets user identification to choose the correct instance which gets synchronized or will be synchronized to the main.
  */
  setUpIds(dId: number, rId: string) {
    this.deviceId = dId;
    this.roomId = rId;
    this.localUser.userId = dId === 0 ? 'Main' : 'Projector ' + dId;
    this.localUser.userName = dId === 0 ? 'Main' : 'Projector ' + dId;
  }

  // Transform given euler angles to usable quaternion
  eulerToQuaternion(euler: THREE.Euler) {
    const quaternion = new THREE.Quaternion();
    quaternion.setFromEuler(euler);
    return quaternion;
  }

  // Sets the projector angles of the device: Detection of device via payload at start of synchronization
  // Could implement a test case for this, but need to save the mpcdi informations for that in frontend?!
  setProjectorAngle(projectorAngles: any) {
    console.log(projectorAngles);
    this.projectorAngles = {
      left: projectorAngles.left,
      right: projectorAngles.right,
      up: projectorAngles.up,
      down: projectorAngles.down,
    };
  }

  // Sets projector yaw, pitch and roll angles of the device.
  // Device detection same as projector angle
  setProjectorYawPitchRoll(yawPitchRoll: YawPitchRoll) {
    console.log(yawPitchRoll);
    this.projectorQuaternion = {
      quaternion: this.eulerToQuaternion(
        new THREE.Euler(
          -yawPitchRoll.pitch * DEG2RAD, // NEGATIVE Pitch
          yawPitchRoll.yaw * DEG2RAD, // Yaw
          yawPitchRoll.roll * DEG2RAD, // Roll
          'ZXY'
        )
      ),
    };
  }

  setProjectorConfigurations(projectorConfiguration: ProjectorConfigurations) {
    this.setProjectorYawPitchRoll(projectorConfiguration.yawPitchRoll);
    this.setProjectorAngle(projectorConfiguration.projectorAngles);
  }

  // Positive Roll, Positive Pitch, Negative Heading
  // Positionservice
  /* Rotation by Camera: MPCDI
     Roll: X
     Pitch: Y
     Yaw: Z
  */
  last_order = '';

  setUpQuaternionArr(): ProjectorQuaternions {
    // roll pitch yaw
    const projector_angles = [
      [-14.315, 24.45517, 37.73257],
      [16.31073, 27.50301, -35.22566],
      [23.7238, 50.71501, -118.98493],
      [-27.00377, 53.37216, 116.72392],
      [2.18843, 73.21593, -9.4374],
    ];

    const base_orders = ['RPH', 'PRH', 'RHP', 'HRP', 'HPR', 'PHR'];

    const r = base_orders.flatMap((x) => {
      return [0, 1, 2, 3, 4, 5, 6, 7].map((y) => {
        return x
          .split('')
          .map((z, i) => {
            return y & (1 << i) ? 'P' + z : 'N' + z;
          })
          .join(',');
      });
    });

    const second = (new Date().getTime() / 3000) | 0;
    //let order = r[second % r.length];
    const order = 'NP,PH,PR';
    if (order != this.last_order) {
      console.log(order);
      this.last_order = order;
    }
    //const order = "PR,PP,NH";
    const prefixes = order.split(',');

    const quaternions = projector_angles.map((axis) => {
      const axes = new Map();
      axes.set(
        'NR',
        new THREE.Quaternion(0, 0, 0, 0).setFromAxisAngle(
          new THREE.Vector3(0, 0, -1),
          axis[0] * THREE.MathUtils.DEG2RAD
        )
      );
      axes.set(
        'PR',
        new THREE.Quaternion(0, 0, 0, 0).setFromAxisAngle(
          new THREE.Vector3(0, 0, 1),
          axis[0] * THREE.MathUtils.DEG2RAD
        )
      );
      axes.set(
        'NH',
        new THREE.Quaternion(0, 0, 0, 0).setFromAxisAngle(
          new THREE.Vector3(0, -1, 0),
          axis[2] * THREE.MathUtils.DEG2RAD
        )
      );
      axes.set(
        'PH',
        new THREE.Quaternion(0, 0, 0, 0).setFromAxisAngle(
          new THREE.Vector3(0, 1, 0),
          axis[2] * THREE.MathUtils.DEG2RAD
        )
      );
      axes.set(
        'NP',
        new THREE.Quaternion(0, 0, 0, 0).setFromAxisAngle(
          new THREE.Vector3(-1, 0, 0),
          axis[1] * THREE.MathUtils.DEG2RAD
        )
      );
      axes.set(
        'PP',
        new THREE.Quaternion(0, 0, 0, 0).setFromAxisAngle(
          new THREE.Vector3(1, 0, 0),
          axis[1] * THREE.MathUtils.DEG2RAD
        )
      );

      const rot_a = axes.get(prefixes[0]);
      const rot_b = axes.get(prefixes[1]);
      const rot_c = axes.get(prefixes[2]);
      return rot_a.clone().multiply(rot_b).multiply(rot_c);
    });

    return { quaternions };

    // Positive Roll (Z-Axe), Negative Pitch (X-Axe), Positive Yaw (Y-Axe)
    // Transform to radians
    const q0 = this.eulerToQuaternion(
      new THREE.Euler(
        -24.45517 * THREE.MathUtils.DEG2RAD, // NEGATIVE Pitch
        37.73257 * THREE.MathUtils.DEG2RAD, // Yaw
        -14.315 * THREE.MathUtils.DEG2RAD, // Roll
        'ZXY'
      )
    );

    const q1 = this.eulerToQuaternion(
      new THREE.Euler(
        -27.50301 * THREE.MathUtils.DEG2RAD, // NEGATIVE Pitch
        -35.22566 * THREE.MathUtils.DEG2RAD, // Yaw
        16.31073 * THREE.MathUtils.DEG2RAD, // Roll
        'ZXY'
      )
    );
    const q2 = this.eulerToQuaternion(
      new THREE.Euler(
        -50.71501 * THREE.MathUtils.DEG2RAD, // NEGATIVE Pitch
        -118.98493 * THREE.MathUtils.DEG2RAD, // Yaw
        23.7238 * THREE.MathUtils.DEG2RAD, // Roll
        'ZXY'
      )
    );
    const q3 = this.eulerToQuaternion(
      new THREE.Euler(
        -53.37216 * THREE.MathUtils.DEG2RAD, // NEGATIVE Pitch
        116.72392 * THREE.MathUtils.DEG2RAD, // Yaw
        -27.00377 * THREE.MathUtils.DEG2RAD, // Roll
        'ZXY'
      )
    );
    const q4 = this.eulerToQuaternion(
      new THREE.Euler(
        -73.21593 * THREE.MathUtils.DEG2RAD, // NEGATIVE Pitch
        -9.4374 * THREE.MathUtils.DEG2RAD, // Yaw
        2.18843 * THREE.MathUtils.DEG2RAD, // Roll
        'ZXY'
      )
    );

    return { quaternions: [q0, q1, q2, q3, q4] };
  }

  setUpAngleArr(): ProjectorAngles2 {
    const pA0: ProjectorAngles = {
      left: 62.0003,
      right: 62.0003,
      up: 49.6109237,
      down: 49.6109237,
    };

    const pA1: ProjectorAngles = {
      left: 62,
      right: 62,
      up: 49.61092,
      down: 49.61092,
    };

    const pA2: ProjectorAngles = {
      left: 62.0002972,
      right: 62.0002972,
      up: 49.6109237,
      down: 49.6109237,
    };

    const pA3: ProjectorAngles = {
      left: 62.0002972,
      right: 62.0002972,
      up: 49.6109237,
      down: 49.6109237,
    };

    const pA4: ProjectorAngles = {
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
  setUpVerticalFov(projectorAngle: ProjectorAngles) {
    // tangents returns angle of given value in radians
    const tanUp = Math.tan(projectorAngle.up * DEG2RAD);
    const tanDown = Math.tan(projectorAngle.down * DEG2RAD);

    // The total vertical field of view will be the sum of the up and down angles.
    // Since tan(θ) gives us the opposite/adjacent relationship in a right triangle,
    // we can use the arctangent function to retrieve the angle in radians and then convert it to degrees.
    this.verticalAngleRad = Math.atan(tanUp) + Math.atan(tanDown);
    // Perspective Camera uses degree
    const projectorVerticalAngleDeg = this.verticalAngleRad * RAD2DEG;

    this.localUser.camera.fov = projectorVerticalAngleDeg;
    this.localUser.camera.updateProjectionMatrix();
  }

  setUpAspect(projectorAngle: ProjectorAngles) {
    // tangents returns angle of given value in radians
    const tanLeft = Math.tan(projectorAngle.left * DEG2RAD);
    const tanRight = Math.tan(projectorAngle.right * DEG2RAD);

    // The aspect ratio is the ratio of the width to the height of the frustum.
    // In terms of angles, this would be the ratio of the sum of the right and left angles to the sum of the up and down angles.
    this.horizontalAngleRad = Math.atan(tanRight) + Math.atan(tanLeft);
    this.aspect = this.horizontalAngleRad / this.verticalAngleRad;

    this.localUser.camera.aspect = this.aspect;
    this.localUser.camera.updateProjectionMatrix();
  }

  setUpCamera(projectorAngle: ProjectorAngles) {
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
