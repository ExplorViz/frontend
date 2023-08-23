import Service, { inject as service } from '@ember/service';
import LocalUser from './local-user';
import CollaborationSession from './collaboration-session';
import * as THREE from 'three';

export type YawPitchRoll = {
  yaw: number;
  pitch: number;
  roll: number;
};

export type ProjectorQuaternion = {
  quaternion: THREE.Quaternion;
};

export type ProjectorAngle = {
  left: number;
  right: number;
  up: number;
  down: number;
};

export type ProjectorConfigurations = {
  yawPitchRoll: YawPitchRoll;
  projectorAngle: ProjectorAngle;
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

  // FOV
  private verticalAngleRad!: number;
  private horizontalAngleRad!: number;

  // Aspect
  private aspect!: number;

  projectorAngle?: ProjectorAngle;
  projectorQuaternion?: ProjectorQuaternion;

  // Things to consider:
  // 1) Tilt
  private tilt: number = 21;
  // 2) Circle position
  private circleRotation?: THREE.Euler;
  // 3) Order of Euler: 'ZYX' according to mpcdi-file
  // 4) Fullscreen

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
  setProjectorAngle(projectorAngle: ProjectorAngle) {
    this.projectorAngle = projectorAngle;
  }

  // Sets projector yaw, pitch and roll angles of the device.
  // Device detection same as projector angle
  setProjectorYawPitchRoll(yawPitchRoll: YawPitchRoll) {
    this.projectorQuaternion = {
      quaternion: this.eulerToQuaternion(
        new THREE.Euler(
          yawPitchRoll.roll * THREE.MathUtils.DEG2RAD,
          yawPitchRoll.pitch * THREE.MathUtils.DEG2RAD,
          yawPitchRoll.yaw * THREE.MathUtils.DEG2RAD,
          'ZYX'
        )
      ),
    };
  }

  setProjectorConfigurations(projectorConfiguration: ProjectorConfigurations) {
    this.setProjectorYawPitchRoll(projectorConfiguration.yawPitchRoll);
    this.setProjectorAngle(projectorConfiguration.projectorAngle);
  }

  // Positive Roll, Positive Pitch, Negative Heading
  // Positionservice
  /* Rotation by Camera: MPCDI
     Roll: X
     Pitch: Y
     Yaw: Z
  */
  last_order = "";

  setUpQuaternionArr(): ProjectorQuaternions {
    // roll pitch yaw
    const projector_angles = [
      [-14.315, 24.45517, 37.73257],
      [16.31073, 27.50301, -35.22566],
      [23.7238, 50.71501, -118.98493],
      [-27.00377, 53.37216, 116.72392],
      [2.18843, 73.21593, -9.4374]
    ];

    let base_orders = [
      	"RPH",
        "PRH",
        "RHP",
        "HRP",
        "HPR",
        "PHR"
    ];

    let r = base_orders.flatMap(x => {
      return [0,1,2,3,4,5,6,7].map(y => {
        return x.split("").map((z,i) => {
          return y & (1 << i) ? "P" + z : "N" + z
        }).join(",");
      });
    });

    let second = (new Date().getTime() / 3000) | 0;
    //let order = r[second % r.length];
    let order = "NP,PH,PR"
    if (order != this.last_order){
      console.log(order);
      this.last_order = order;
    }
    //const order = "PR,PP,NH";
    const prefixes = order.split(",");

    let quaternions = projector_angles.map(axis => {
      let axes = new Map();
      axes.set("NR", (new THREE.Quaternion(0, 0, 0, 0)).setFromAxisAngle(new THREE.Vector3(0, 0, -1), axis[0] * THREE.MathUtils.DEG2RAD));
      axes.set("PR", (new THREE.Quaternion(0, 0, 0, 0)).setFromAxisAngle(new THREE.Vector3(0, 0, 1), axis[0] * THREE.MathUtils.DEG2RAD));
      axes.set("NH", (new THREE.Quaternion(0, 0, 0, 0)).setFromAxisAngle(new THREE.Vector3(0, -1, 0), axis[2] * THREE.MathUtils.DEG2RAD));
      axes.set( "PH", (new THREE.Quaternion(0, 0, 0, 0)).setFromAxisAngle(new THREE.Vector3(0, 1, 0), axis[2] * THREE.MathUtils.DEG2RAD));
      axes.set("NP", (new THREE.Quaternion(0, 0, 0, 0)).setFromAxisAngle(new THREE.Vector3(-1, 0, 0), axis[1] * THREE.MathUtils.DEG2RAD));
      axes.set("PP", (new THREE.Quaternion(0, 0, 0, 0)).setFromAxisAngle(new THREE.Vector3(1, 0, 0), axis[1] * THREE.MathUtils.DEG2RAD));

      let rot_a = axes.get(prefixes[0]);
      let rot_b = axes.get(prefixes[1]);
      let rot_c = axes.get(prefixes[2]);
      return rot_a.clone().multiply(rot_b).multiply(rot_c);
    });    

    return { quaternions };

    // Transform to radians
    const q0 = this.eulerToQuaternion(
      new THREE.Euler(
        (-14.315
          // - (90 - this.tilt)
        ) 
          * THREE.MathUtils.DEG2RAD,
        (24.45517 
          // - (45)
        ) * THREE.MathUtils.DEG2RAD,
        (37.73257
          // + (this.tilt)
        ) * THREE.MathUtils.DEG2RAD,
        'XYZ'
      )
    );

    const q1 = this.eulerToQuaternion(
      new THREE.Euler(
        (16.31073 
          // - (90)
        )
        * THREE.MathUtils.DEG2RAD,
        (27.50301 
          // - (90)
          ) * THREE.MathUtils.DEG2RAD,
        (-35.22566
          
          )  * THREE.MathUtils.DEG2RAD,
        'XYZ'
      )
    );
    const q2 = this.eulerToQuaternion(
      new THREE.Euler(
        23.7238 * THREE.MathUtils.DEG2RAD,
        (50.71501 
          // - (90 - this.tilt)
          ) * THREE.MathUtils.DEG2RAD,
        (-118.98493
        // + this.tilt
        )  * THREE.MathUtils.DEG2RAD,
        'XYZ'
      )
    );
    const q3 = this.eulerToQuaternion(
      new THREE.Euler(
        (-27.00377
          // - 45
        ) * THREE.MathUtils.DEG2RAD,
        (53.37216 
          // + (45)
          ) * THREE.MathUtils.DEG2RAD,
        (116.72392
          // + 180
          )  * THREE.MathUtils.DEG2RAD,
        'XYZ'
      )
    );
    const q4 = this.eulerToQuaternion(
      new THREE.Euler(
        (2.18843
          // + (this.tilt)
         ) * THREE.MathUtils.DEG2RAD,
        (73.21593 
          // - (90 - this.tilt)
          )  * THREE.MathUtils.DEG2RAD,
        (-9.4374
          // + (this.tilt)
          )  * THREE.MathUtils.DEG2RAD,
        'XYZ'
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
    //this.localUser.camera.updateProjectionMatrix();
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
    //this.localUser.camera.updateProjectionMatrix();
  }

  setUpCamera(projectorAngle: ProjectorAngle) {
    //this.setUpVerticalFov(projectorAngle);
    //this.setUpAspect(projectorAngle);
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'synchronization-session': SynchronizationSession;
  }
}
