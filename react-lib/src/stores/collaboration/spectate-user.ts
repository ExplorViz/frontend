import { create } from 'zustand';
import { useCollaborationSessionStore } from 'react-lib/src/stores/collaboration/collaboration-session';
import { useLocalUserStore } from 'react-lib/src/stores/collaboration/local-user';
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
// import debugLogger from 'ember-debug-logger';
import CameraControls from 'react-lib/src/utils/application-rendering/camera-controls';
import * as VrPoses from 'react-lib/src/utils/extended-reality/vr-helpers/vr-poses';
import { VrPose } from 'react-lib/src/utils/extended-reality/vr-helpers/vr-poses';
import { useMessageSenderStore } from './message-sender';
import { SELF_DISCONNECTED_EVENT } from 'react-lib/src/stores/collaboration/web-socket';
import equal from 'fast-deep-equal';
import { useToastHandlerStore } from 'react-lib/src/stores/toast-handler';
import eventEmitter from '../../utils/event-emitter';

interface SpectateUserState {
  spectatedUser: RemoteUser | null;
  cameraControls: CameraControls | null;
  spectateConfigurationId: string;
  spectatingUsers: Set<string>;
  lastPose?: VrPose;
  _init: () => void;
  willDestroy: () => void;
  _reset: () => void;
  _addSpectatingUser: (id: string) => void;
  _removeSpectatingUser: (id: string) => void;
  isActive: () => boolean;
  tick: () => void;
  activate: (remoteUser: RemoteUser, sendUpdate?: boolean) => void;
  activateConfig: (configId: string, remoteUsersIds: string[]) => void;
  deactivate: (sendUpdate?: boolean) => void;
  _onUserDisconnect: ({ id }: UserDisconnectedMessage) => void;
  _onSpectatingUpdate: ({
    originalMessage: {
      isSpectating,
      spectatedUserId,
      spectatingUserIds,
      configuration,
    },
  }: ForwardedMessage<SpectatingUpdateMessage>) => void;
  displaySpectateMessage: (
    spectatedUser: RemoteUser | any, // any instead of old LocalUser class
    spectatingUsers: (RemoteUser | any)[], // any instead of old LocalUser class
    isSpectating: boolean
  ) => void;
  applyCameraConfiguration: (configuration: {
    id: string;
    devices: { deviceId: string; projectionMatrix: number[] }[] | null;
  }) => void;
}

export const useSpectateUserStore = create<SpectateUserState>((set, get) => ({
  spectatedUser: null, // tracked
  cameraControls: null,
  spectateConfigurationId: 'default', // tracked
  spectatingUsers: new Set<string>(),
  lastPose: undefined,

  _init: () => {
    eventEmitter.on(USER_DISCONNECTED_EVENT, get()._onUserDisconnect);
    eventEmitter.on(SPECTATING_UPDATE_EVENT, get()._onSpectatingUpdate);
    eventEmitter.on(SELF_DISCONNECTED_EVENT, get()._reset);
  },

  // Must be called explicitly
  willDestroy: () => {
    eventEmitter.off(USER_DISCONNECTED_EVENT, get()._onUserDisconnect);
    eventEmitter.off(SPECTATING_UPDATE_EVENT, get()._onSpectatingUpdate);
    eventEmitter.off(SELF_DISCONNECTED_EVENT, get()._reset);
  },

  // private
  _reset: () => {
    const newSU = get().spectatingUsers;
    newSU?.clear();
    set({ spectatingUsers: newSU, spectatedUser: null });
  },

  // private
  _addSpectatingUser: (id: string) => {
    const newSU = get().spectatingUsers;
    newSU.add(id);
    set({ spectatingUsers: newSU });
  },

  // private
  _removeSpectatingUser: (id: string) => {
    const newSU = get().spectatingUsers;
    newSU.delete(id);
    set({ spectatingUsers: newSU });
  },

  isActive: () => {
    return get().spectatedUser !== null;
  },

  /**
   * Used in spectating mode to set user's camera position to the spectated user's position
   */
  tick: () => {
    if (get().spectatedUser?.camera) {
      if (useLocalUserStore.getState().xr?.isPresenting) {
        useLocalUserStore
          .getState()
          .teleportToPosition(get().spectatedUser.camera.model.position);
      } else {
        useLocalUserStore
          .getState()
          .camera.position.copy(get().spectatedUser.camera.model.position);
        useLocalUserStore
          .getState()
          .camera.quaternion.copy(get().spectatedUser.camera.model.quaternion);
      }
    } else if (get().spectatingUsers.size > 0) {
      const poses = VrPoses.getPoses(
        useLocalUserStore.getState().camera,
        useLocalUserStore.getState().controller1,
        useLocalUserStore.getState().controller2
      );
      if (equal(get().lastPose, poses)) {
        useMessageSenderStore
          .getState()
          .sendPoseUpdate(poses.camera, poses.controller1, poses.controller2);
      }
      set({ lastPose: poses });
    }
  },

  /**
   * Switches our user into spectator mode
   * @param {number} userId The id of the user to be spectated
   */
  activate: (remoteUser: RemoteUser, sendUpdate = true) => {
    set({ spectatedUser: remoteUser });

    if (useLocalUserStore.getState().controller1) {
      useLocalUserStore.getState().controller1.setToSpectatingAppearance();
    }
    if (useLocalUserStore.getState().controller2) {
      useLocalUserStore.getState().controller2.setToSpectatingAppearance();
    }
    if (get().cameraControls) {
      let newCC = get().cameraControls;
      newCC!.enabled = false;
      set({ cameraControls: newCC });
    }

    remoteUser.setHmdVisible(false);
    if (sendUpdate) {
      useMessageSenderStore
        .getState()
        .sendSpectatingUpdate(this.isActive, remoteUser.userId, [
          useLocalUserStore.getState().userId,
        ]);
    }
  },

  activateConfig: (configId: string, remoteUsersIds: string[]) => {
    useMessageSenderStore
      .getState()
      .sendSpectatingUpdate(
        configId === 'arena-2',
        useLocalUserStore.getState().userId,
        remoteUsersIds,
        configId
      );
  },

  /**
   * Deactives spectator mode for our user
   */
  deactivate: (sendUpdate = true) => {
    // Reset possibly changed projection matrix to reflect actual camera parameters
    useLocalUserStore.getState().defaultCamera.updateProjectionMatrix();

    if (get().cameraControls) {
      let newCC = get().cameraControls;
      newCC!.enabled = true;
      set({ cameraControls: newCC });
    }
    if (!get().spectatedUser) return;

    if (useLocalUserStore.getState().controller1) {
      useLocalUserStore.getState().controller1.setToDefaultAppearance();
    }
    if (useLocalUserStore.getState().controller2) {
      useLocalUserStore.getState().controller2.setToDefaultAppearance();
    }

    if (sendUpdate) {
      useMessageSenderStore
        .getState()
        .sendSpectatingUpdate(false, get().spectatedUser.userId, [
          useLocalUserStore.getState().userId,
        ]);
    }
    let newSU = get().spectatedUser;
    newSU!.setHmdVisible(true);
    newSU = null;
    set({
      spectatedUser: newSU,
      spectateConfigurationId: 'default',
    });
  },

  // private
  _onUserDisconnect: ({ id }: UserDisconnectedMessage) => {
    get()._removeSpectatingUser(id);

    if (get().spectatedUser?.userId === id) {
      get().deactivate(true);
    }
  },

  // private
  /**
   * Updates the state of given user to spectating or connected.
   * Hides them if spectating.
   *
   * @param {string} userId - The user's id.
   * @param {boolean} isSpectating - True, if the user is now spectating, else false.
   */
  _onSpectatingUpdate: ({
    originalMessage: {
      isSpectating,
      spectatedUserId,
      spectatingUserIds,
      configuration,
    },
  }: ForwardedMessage<SpectatingUpdateMessage>): void => {
    const spectatedUser = useCollaborationSessionStore
      .getState()
      .getUserById(spectatedUserId);

    if (!spectatedUser) {
      get().deactivate(false);
      return;
    }

    const spectatingUsers = spectatingUserIds
      .map((userId) =>
        useCollaborationSessionStore.getState().getUserById(userId)
      )
      .filter((user) => user !== undefined) as RemoteUser[];

    get().displaySpectateMessage(spectatedUser, spectatingUsers, isSpectating);

    // Deactivate spectating if it is not spectated
    if (!isSpectating) {
      get().deactivate(false);
      spectatingUserIds.forEach((userId) =>
        get()._removeSpectatingUser(userId)
      );
    }

    // Add spectating users if we are spectated
    if (!(spectatedUser instanceof RemoteUser)) {
      spectatingUserIds.forEach((userId) => get()._addSpectatingUser(userId));
      return;
    }

    // Check if we should be spectating a user
    if (
      isSpectating &&
      spectatingUsers.some((user) => !(user instanceof RemoteUser))
    ) {
      get().activate(spectatedUser, false);
      get().applyCameraConfiguration(configuration);
    } else {
      // Update spectatedUser's state and visibility
      spectatedUser.state = isSpectating ? 'spectating' : 'online';
      spectatedUser.setVisible(!isSpectating);
    }
  },

  // TODO: How to handle LocalUser type?
  displaySpectateMessage: (
    spectatedUser: RemoteUser | any, // any instead of old LocalUser class
    spectatingUsers: (RemoteUser | any)[], // any instead of old LocalUser class
    isSpectating: boolean
  ) => {
    //const spectatedHexColor = `#${spectatedUser.color.getHexString()}`;
    let text = '';
    let spectatingUserNames = 'Nobody';

    if (spectatingUsers.length > 0) {
      spectatingUserNames = spectatingUsers
        .map((user) => user.userName)
        .reduce((usernames, username) => usernames + ', ' + username);
    }

    if (isSpectating && !(spectatedUser instanceof RemoteUser)) {
      text = 'is now spectating you';
    } else if (isSpectating) {
      text = 'is now spectating';
    } else {
      text = 'stopped spectating';
    }

    const userName = spectatingUserNames || 'Unknown';

    useToastHandlerStore.getState().showInfoToastMessage(`${userName} ${text}`);
  },

  applyCameraConfiguration: (configuration: {
    id: string;
    devices: { deviceId: string; projectionMatrix: number[] }[] | null;
  }) => {
    if (!configuration || !configuration.devices) {
      return;
    }
    // Adapt projection matrix according to spectate update
    const deviceId = new URLSearchParams(window.location.search).get(
      'deviceId'
    );
    set({ spectateConfigurationId: configuration.id });
    const deviceConfig = configuration.devices.find(
      (device) => device.deviceId === deviceId
    );
    if (!deviceConfig) {
      return;
    }

    // Apply projection matrix
    useLocalUserStore
      .getState()
      .camera.projectionMatrix.fromArray(deviceConfig.projectionMatrix);
  },
}));

useSpectateUserStore.getState()._init();
