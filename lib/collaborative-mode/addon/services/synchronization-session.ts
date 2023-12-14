import Service, { inject as service } from '@ember/service';
import LocalUser from './local-user';
import * as THREE from 'three';
import { DEG2RAD } from 'three/src/math/MathUtils';

export type YawPitchRoll = {
  yaw: number;
  pitch: number;
  roll: number;
};

export type ProjectorAngles = {
  left: number;
  right: number;
  up: number;
  down: number;
};

// Response type, which carries all projector informations sent from collaboration service
export type ProjectorConfigurations = {
  id: string;
  yawPitchRoll: YawPitchRoll;
  projectorAngles: ProjectorAngles;
};

// Quaternion which actually getting used for synchronization and shifting the projection according to usability
export type ProjectorQuaternion = {
  synchronizationQuaternion: THREE.Quaternion;
  domeTiltQuaternion: THREE.Quaternion;
};

/**
 * This class constists of all needed graphical information.
 * Here, lay down also all manipulation and information-restructure functions
 * to keep typesafety and a clear structure while processing the synchronization.
 */
export default class SynchronizationSession extends Service {
  @service('local-user')
  private localUser!: LocalUser;

  isSynchronizationSession: boolean = false;
  // The id of the connected device
  deviceId!: string;
  // synchronisation-room-id
  roomId!: string;

  // Projector angles in ARENA2 for FOV and Aspect of frustum
  projectorAngles!: ProjectorAngles;
  // Projector rotation in ARENA2
  projectorQuaternion!: ProjectorQuaternion;

  // domeTilt for moving the projection into center of dome
  private domeTilt: number = 45;

  /** ###########################################################################
   *  ############### SYNCHRONIZATION START: SERVICE SET UP
   *  ###########################################################################
   */
  /* Sets up important Ids: Essentially manages and starts synchronization behaviour
  1) deviceId: Detection of device to request correct (a) projector angle and (b) yaw/pitch/roll angles.
  2) roomId: Sets the room name to this and impacts which room is hosted or joined by synchronization user.
  3) isSynchronizationSession: General identifier for synchronization process.
  4) userId & userName: Sets user identification to choose the correct instance which gets synchronized or will be synchronized to the main.
  */
  setUpIds(deviceId: string, roomId: string) {
    this.deviceId = deviceId;
    this.roomId = roomId;
    this.isSynchronizationSession = true;
    this.localUser.userId = deviceId === '' ? 'Main' : 'Projector ' + deviceId;
    this.localUser.userName =
      deviceId === '' ? 'Main' : 'Projector ' + deviceId;
  }

  destroyIds() {
    this.deviceId = '';
    this.roomId = '';
    this.isSynchronizationSession = false;
    this.localUser.userId = 'unknown';
    this.localUser.userName = 'unknown';
  }

  setProjectorConfigurations(projectorConfiguration: ProjectorConfigurations) {
    this.setProjectorQuaternion(projectorConfiguration.yawPitchRoll);
    this.setProjectorAngle(projectorConfiguration.projectorAngles);
  }

  /** ###########################################################################
   *  ############### DURING SYNCHRONIZATION: PROJECTION MANIPULATION
   *  ###########################################################################
   */
  // Considers dome tilt and shifts the projection to the dome center
  getDomeTiltQuaternion() {
    // 360° whole globe, 180° half globe after horizontal cut, 90° half of half globe with vertical cut.
    // Horizontal cut, then vertical cut of half globe = angle from border to dometop center
    const shiftedAngle = 360 / 2 / 2 - this.domeTilt;

    // after setting up rotation axes via synchronisation,
    // we can use positive pitch to shift synchronized projection to the center of the globe.
    const domeTiltQuaternion = new THREE.Quaternion(
      0,
      0,
      0,
      0
    ).setFromAxisAngle(
      new THREE.Vector3(1, 0, 0),
      shiftedAngle * THREE.MathUtils.DEG2RAD
    );

    return domeTiltQuaternion;
  }

  // Sets projector yaw, pitch and roll angles of the device.
  // Device detection same as projector angle
  setProjectorQuaternion(yawPitchRoll: YawPitchRoll) {
    this.projectorQuaternion = {
      synchronizationQuaternion: new THREE.Quaternion().setFromEuler(
        new THREE.Euler(
          -yawPitchRoll.pitch * DEG2RAD, // NEGATIVE Pitch
          yawPitchRoll.yaw * DEG2RAD, // Yaw
          yawPitchRoll.roll * DEG2RAD, // Roll
          'ZXY'
        )
      ),
      domeTiltQuaternion: this.getDomeTiltQuaternion(),
    };
  }

  // Sets the projector angles of the device: Detection of device via payload at start of synchronization
  // Could implement a test case for this, but need to save the mpcdi informations for that in frontend?!
  setProjectorAngle(projectorAngles: any) {
    this.projectorAngles = {
      left: projectorAngles.left,
      right: projectorAngles.right,
      up: projectorAngles.up,
      down: projectorAngles.down,
    };
  }

  /**
   * Sets up projection matrix by configuring aspect, fov,
   * rotations according to yaw, pitch and roll in the mpcdi file.
   */
  setUpCamera() {
    // Set up fov and aspect
    this.localUser.camera.projectionMatrix.copy(
      new THREE.Matrix4().makePerspective(
        -Math.tan(this.projectorAngles.left * DEG2RAD) *
          this.localUser.camera.near,
        Math.tan(this.projectorAngles.right * DEG2RAD) *
          this.localUser.camera.near,
        Math.tan(this.projectorAngles.down * DEG2RAD) *
          this.localUser.camera.near,
        -Math.tan(this.projectorAngles.up * DEG2RAD) *
          this.localUser.camera.near,
        this.localUser.camera.near,
        this.localUser.camera.far
      )
    );

    // Set up Yaw, Pitch and Roll
    this.localUser.camera.projectionMatrix.multiply(
      new THREE.Matrix4().makeRotationFromQuaternion(
        this.projectorQuaternion.synchronizationQuaternion
      )
    );

    // consider dometilt AFTER synchronisation, shifting all projections to the center of dome
    this.localUser.camera.projectionMatrix.multiply(
      new THREE.Matrix4().makeRotationFromQuaternion(
        this.projectorQuaternion.domeTiltQuaternion
      )
    );
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'synchronization-session': SynchronizationSession;
  }
}
