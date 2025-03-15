import Service, { inject as service } from '@ember/service';
import CollaborationSession from 'explorviz-frontend/services/collaboration/collaboration-session';
import LocalUser from 'explorviz-frontend/services/collaboration/local-user';
import RemoteUser from 'react-lib/src/utils/collaboration/remote-user';
import { ForwardedMessage } from 'react-lib/src/utils/collaboration/web-socket-messages/receivable/forwarded';
import {
  USER_DISCONNECTED_EVENT,
  UserDisconnectedMessage,
} from 'react-lib/src/utils/collaboration/web-socket-messages/receivable/user-disconnect';
import {
  SPECTATING_UPDATE_EVENT,
  SpectatingUpdateMessage,
} from 'react-lib/src/utils/collaboration/web-socket-messages/sendable/spectating-update';
import debugLogger from 'ember-debug-logger';
import CameraControls from 'react-lib/src/utils/application-rendering/camera-controls';
import * as VrPoses from 'explorviz-frontend/utils/extended-reality/vr-helpers/vr-poses';
import { VrPose } from 'explorviz-frontend/utils/extended-reality/vr-helpers/vr-poses';
import MessageSender from './message-sender';
import { SELF_DISCONNECTED_EVENT } from 'react-lib/src/stores/collaboration/web-socket';
import equal from 'fast-deep-equal';
import { useSpectateUserStore } from 'react-lib/src/stores/collaboration/spectate-user';
import { useToastHandlerStore } from 'react-lib/src/stores/toast-handler';
import eventEmitter from 'react-lib/src/utils/event-emitter';

export default class SpectateUser extends Service {
  debug = debugLogger('spectateUserService');

  @service('collaboration/local-user')
  private localUser!: LocalUser;

  @service('collaboration/message-sender')
  private sender!: MessageSender;

  @service('collaboration/collaboration-session')
  collaborationSession!: CollaborationSession;

  // @tracked
  // spectatedUser: RemoteUser | null = null;

  // TODO migrate RemoteUser first
  get spectatedUser(): RemoteUser | null {
    return useSpectateUserStore.getState().spectatedUser;
  }

  set spectatedUser(value: RemoteUser | null) {
    useSpectateUserStore.setState({ spectatedUser: value });
  }

  // cameraControls: CameraControls | null = null;
  get cameraControls(): CameraControls | null {
    return useSpectateUserStore.getState().cameraControls;
  }

  set cameraControls(value: CameraControls | null) {
    useSpectateUserStore.setState({ cameraControls: value });
  }

  // @tracked
  // spectateConfigurationId = 'default';
  get spectateConfigurationId(): string {
    return useSpectateUserStore.getState().spectateConfigurationId;
  }

  set spectateConfigurationId(value: string) {
    useSpectateUserStore.setState({ spectateConfigurationId: value });
  }

  // private spectatingUsers: Set<string> = new Set<string>();
  private get spectatingUsers(): Set<string> {
    return useSpectateUserStore.getState().spectatingUsers;
  }

  private set spectatingUsers(value: Set<string>) {
    useSpectateUserStore.setState({ spectatingUsers: value });
  }

  init() {
    super.init();

    this.debug('Initializing collaboration session');
    eventEmitter.on(USER_DISCONNECTED_EVENT, this.onUserDisconnect);
    eventEmitter.on(SPECTATING_UPDATE_EVENT, this.onSpectatingUpdate);
    eventEmitter.on(SELF_DISCONNECTED_EVENT, this.reset);
  }

  willDestroy() {
    eventEmitter.off(USER_DISCONNECTED_EVENT, this.onUserDisconnect);
    eventEmitter.off(SPECTATING_UPDATE_EVENT, this.onSpectatingUpdate);
    eventEmitter.off(SELF_DISCONNECTED_EVENT, this.reset);
  }

  private reset() {
    this.spectatingUsers.clear();
    this.spectatedUser = null;
  }

  private addSpectatingUser(id: string) {
    this.spectatingUsers.add(id);
  }

  private removeSpectatingUser(id: string) {
    this.spectatingUsers.delete(id);
  }

  get isActive() {
    return this.spectatedUser !== null;
  }

  lastPose?: VrPose;

  // TODO migrate VrPose first
  // get lastPose(): VrPose | undefined {
  //   return useSpectateUserStore.getState().lastPose;
  // }

  // set lastPose(value: VrPose) {
  //   useSpectateUserStore.setState({ lastPose: value });
  // }

  /**
   * Used in spectating mode to set user's camera position to the spectated user's position
   */
  tick() {
    if (this.spectatedUser?.camera) {
      if (this.localUser.xr?.isPresenting) {
        this.localUser.teleportToPosition(
          this.spectatedUser.camera.model.position
        );
      } else {
        this.localUser.camera.position.copy(
          this.spectatedUser.camera.model.position
        );
        this.localUser.camera.quaternion.copy(
          this.spectatedUser.camera.model.quaternion
        );
      }
    } else if (this.spectatingUsers.size > 0) {
      const poses = VrPoses.getPoses(
        this.localUser.camera,
        this.localUser.controller1,
        this.localUser.controller2
      );
      if (equal(this.lastPose, poses)) {
        this.sender.sendPoseUpdate(
          poses.camera,
          poses.controller1,
          poses.controller2
        );
      }
      this.lastPose = poses;
    }
  }

  /**
   * Switches our user into spectator mode
   * @param {number} userId The id of the user to be spectated
   */
  activate(remoteUser: RemoteUser, sendUpdate = true) {
    this.spectatedUser = remoteUser;

    if (this.localUser.controller1) {
      this.localUser.controller1.setToSpectatingAppearance();
    }
    if (this.localUser.controller2) {
      this.localUser.controller2.setToSpectatingAppearance();
    }
    if (this.cameraControls) {
      this.cameraControls.enabled = false;
    }

    remoteUser.setHmdVisible(false);
    if (sendUpdate) {
      this.sender.sendSpectatingUpdate(this.isActive, remoteUser.userId, [
        this.localUser.userId,
      ]);
    }
  }

  activateConfig(configId: string, remoteUsersIds: string[]) {
    this.sender.sendSpectatingUpdate(
      configId === 'arena-2',
      this.localUser.userId,
      remoteUsersIds,
      configId
    );
  }

  /**
   * Deactives spectator mode for our user
   */
  deactivate(sendUpdate = true) {
    // Reset possibly changed projection matrix to reflect actual camera parameters
    this.localUser.defaultCamera.updateProjectionMatrix();

    if (this.cameraControls) {
      this.cameraControls.enabled = true;
    }
    if (!this.spectatedUser) return;

    if (this.localUser.controller1) {
      this.localUser.controller1.setToDefaultAppearance();
    }
    if (this.localUser.controller2) {
      this.localUser.controller2.setToDefaultAppearance();
    }

    if (sendUpdate) {
      this.sender.sendSpectatingUpdate(false, this.spectatedUser.userId, [
        this.localUser.userId,
      ]);
    }
    this.spectatedUser.setHmdVisible(true);
    this.spectatedUser = null;
    this.spectateConfigurationId = 'default';
  }

  private onUserDisconnect({ id }: UserDisconnectedMessage) {
    this.removeSpectatingUser(id);

    if (this.spectatedUser?.userId === id) {
      this.deactivate();
    }
  }

  /**
   * Updates the state of given user to spectating or connected.
   * Hides them if spectating.
   *
   * @param {string} userId - The user's id.
   * @param {boolean} isSpectating - True, if the user is now spectating, else false.
   */
  private onSpectatingUpdate({
    originalMessage: {
      isSpectating,
      spectatedUserId,
      spectatingUserIds,
      configuration,
    },
  }: ForwardedMessage<SpectatingUpdateMessage>): void {
    const spectatedUser =
      this.collaborationSession.getUserById(spectatedUserId);

    if (!spectatedUser) {
      this.deactivate(false);
      return;
    }

    const spectatingUsers = spectatingUserIds
      .map((userId) => this.collaborationSession.getUserById(userId))
      .filter((user) => user !== undefined) as RemoteUser[];

    this.displaySpectateMessage(spectatedUser, spectatingUsers, isSpectating);

    // Deactivate spectating if it is not spectated
    if (!isSpectating) {
      this.deactivate(false);
      spectatingUserIds.forEach((userId) => this.removeSpectatingUser(userId));
    }

    // Add spectating users if we are spectated
    if (spectatedUser instanceof LocalUser) {
      spectatingUserIds.forEach((userId) => this.addSpectatingUser(userId));
      return;
    }

    // Check if we should be spectating a user
    if (
      isSpectating &&
      spectatingUsers.some((user) => user instanceof LocalUser)
    ) {
      this.activate(spectatedUser, false);
      this.applyCameraConfiguration(configuration);
    } else {
      // Update spectatedUser's state and visibility
      spectatedUser.state = isSpectating ? 'spectating' : 'online';
      spectatedUser.setVisible(!isSpectating);
    }
  }

  displaySpectateMessage(
    spectatedUser: RemoteUser | LocalUser,
    spectatingUsers: (RemoteUser | LocalUser)[],
    isSpectating: boolean
  ) {
    //const spectatedHexColor = `#${spectatedUser.color.getHexString()}`;
    let text = '';
    let spectatingUserNames = 'Nobody';

    if (spectatingUsers.length > 0) {
      spectatingUserNames = spectatingUsers
        .map((user) => user.userName)
        .reduce((usernames, username) => usernames + ', ' + username);
    }

    if (isSpectating && spectatedUser instanceof LocalUser) {
      text = 'is now spectating you';
    } else if (isSpectating) {
      text = 'is now spectating';
    } else {
      text = 'stopped spectating';
    }

    const userName = spectatingUserNames || 'Unknown';

    useToastHandlerStore.getState().showInfoToastMessage(`${userName} ${text}`);
  }

  applyCameraConfiguration(configuration: {
    id: string;
    devices: { deviceId: string; projectionMatrix: number[] }[] | null;
  }) {
    if (!configuration || !configuration.devices) {
      return;
    }
    // Adapt projection matrix according to spectate update
    const deviceId = new URLSearchParams(window.location.search).get(
      'deviceId'
    );
    this.spectateConfigurationId = configuration.id;
    const deviceConfig = configuration.devices.find(
      (device) => device.deviceId === deviceId
    );
    if (!deviceConfig) {
      return;
    }

    // Apply projection matrix
    this.localUser.camera.projectionMatrix.fromArray(
      deviceConfig.projectionMatrix
    );
  }
}

declare module '@ember/service' {
  interface Registry {
    'collaboration/spectate-user': SpectateUser;
  }
}
