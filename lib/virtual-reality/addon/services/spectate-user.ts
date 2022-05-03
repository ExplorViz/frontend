import Service, { inject as service } from '@ember/service';
import LocalUser from 'collaborative-mode/services/local-user';
import RemoteUser from 'collaborative-mode/utils/remote-user';
import debugLogger from 'ember-debug-logger';
import THREE from 'three';
import VrMessageSender from 'virtual-reality/services/vr-message-sender';

export default class SpectateUserService extends Service {

  debug = debugLogger('spectateUserService');

  @service('local-user')
  private localUser!: LocalUser;

  @service('vr-message-sender')
  private sender!: VrMessageSender;

  spectatedUser: RemoteUser | null = null;

  private startPosition: THREE.Vector3 = new THREE.Vector3();

  get isActive() {
    return this.spectatedUser !== null;
  }

  /**
   * Used in spectating mode to set user's camera position to the spectated user's position
   */
  tick() {
    if (this.spectatedUser && this.spectatedUser.camera) {
      // this.spectatedUser.camera.model.position.copy(this.localUser.camera.position);
      this.localUser.camera.position.copy(this.spectatedUser.camera.model.position);
      this.localUser.camera.quaternion.copy(this.spectatedUser.camera.model.quaternion);

      // TODO check why this was necessary
      // this.localUser.teleportToPosition(
      //   this.spectatedUser.camera.model.position,
      //   { adaptCameraHeight: true },
      // );
    }
  }

  /**
   * Switches our user into spectator mode
   * @param {number} userId The id of the user to be spectated
   */
  activate(remoteUser: RemoteUser | null) {
    if (!remoteUser) return;

    this.startPosition.copy(this.localUser.getCameraWorldPosition());
    this.spectatedUser = remoteUser;

    if (this.localUser.controller1) {
      this.localUser.controller1.setToSpectatingAppearance();
    }
    if (this.localUser.controller2) {
      this.localUser.controller2.setToSpectatingAppearance();
    }


    // remoteUser.setHmdVisible(false);
    this.sender.sendSpectatingUpdate(this.isActive, remoteUser.userId);
  }

  /**
   * Deactives spectator mode for our user
   */
  deactivate() {
    if (!this.spectatedUser) return;

    if (this.localUser.controller1) {
      this.localUser.controller1.setToDefaultAppearance();
    }
    if (this.localUser.controller2) {
      this.localUser.controller2.setToDefaultAppearance();
    }

    this.localUser.teleportToPosition(this.startPosition, {
      adaptCameraHeight: true,
    });
    // this.spectatedUser.setHmdVisible(true);
    this.spectatedUser = null;

    this.sender.sendSpectatingUpdate(this.isActive, null);
  }

  reset() {
    this.spectatedUser = null;
  }
}

declare module '@ember/service' {
  interface Registry {
    'spectate-user': SpectateUserService;
  }
}
