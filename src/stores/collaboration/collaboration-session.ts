import { create } from 'zustand';

import { useChatStore } from 'explorviz-frontend/src/stores/chat';
import { useLocalUserStore } from 'explorviz-frontend/src/stores/collaboration/local-user';
import { useRoomServiceStore } from 'explorviz-frontend/src/stores/collaboration/room-service';
import { useUserFactoryStore } from 'explorviz-frontend/src/stores/collaboration/user-factory';
import {
  SELF_DISCONNECTED_EVENT,
  useWebSocketStore,
} from 'explorviz-frontend/src/stores/collaboration/web-socket';
import { useLandscapeTokenStore } from 'explorviz-frontend/src/stores/landscape-token';
import { useMinimapStore } from 'explorviz-frontend/src/stores/minimap-service';
import { useRouterStore } from 'explorviz-frontend/src/stores/store-router';
import { useToastHandlerStore } from 'explorviz-frontend/src/stores/toast-handler';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import RemoteUser from 'explorviz-frontend/src/utils/collaboration/remote-user';
import { ForwardedMessage } from 'explorviz-frontend/src/utils/collaboration/web-socket-messages/receivable/forwarded';
import {
  SELF_CONNECTED_EVENT,
  SelfConnectedMessage,
} from 'explorviz-frontend/src/utils/collaboration/web-socket-messages/receivable/self-connected';
import {
  USER_CONNECTED_EVENT,
  UserConnectedMessage,
} from 'explorviz-frontend/src/utils/collaboration/web-socket-messages/receivable/user-connected';
import {
  USER_DISCONNECTED_EVENT,
  UserDisconnectedMessage,
} from 'explorviz-frontend/src/utils/collaboration/web-socket-messages/receivable/user-disconnect';
import {
  USER_KICK_EVENT,
  UserKickEvent,
} from 'explorviz-frontend/src/utils/collaboration/web-socket-messages/sendable/kick-user';
import {
  CONTROLLER_1_ID,
  CONTROLLER_2_ID,
} from 'explorviz-frontend/src/utils/collaboration/web-socket-messages/types/controller-id';
import eventEmitter from 'explorviz-frontend/src/utils/event-emitter';
import {
  USER_POSITIONS_EVENT,
  UserPositionsMessage,
} from 'explorviz-frontend/src/utils/extended-reality/vr-web-wocket-messages/sendable/user-positions';
import { createSearchParams } from 'react-router-dom';
import * as THREE from 'three';

export type ConnectionStatus = 'offline' | 'connecting' | 'online';

interface CollaborationSessionState {
  idToRemoteUser: Map<string, RemoteUser>;
  readonly remoteUserGroup: THREE.Group;
  connectionStatus: ConnectionStatus;
  currentRoomId: string | null;
  previousRoomId: string | null;
  _constructor: () => void;
  getUserCount: () => number;
  willDestroy: () => void;
  addRemoteUser: (remoteUser: RemoteUser) => void;
  removeRemoteUserById: (userId: string) => RemoteUser | undefined;
  _removeRemoteUser: (remoteUser: RemoteUser) => void;
  removeAllRemoteUsers: () => void;
  getUserById: (id: string) => RemoteUser | any | undefined; // any, because LocalUser as Service class not existing anymore
  getAllRemoteUserIds: () => MapIterator<string>;
  getAllRemoteUsers: () => MapIterator<RemoteUser>;
  lookupRemoteUserById: (userId: string) => RemoteUser | undefined;
  getColor: (userId: string) => string;
  onSelfConnected: ({ self, users }: SelfConnectedMessage) => void;
  onUserConnected: ({
    id,
    name,
    color,
    position,
    quaternion,
  }: UserConnectedMessage) => void;
  onUserKickEvent: ({
    originalMessage,
  }: ForwardedMessage<UserKickEvent>) => void;
  onUserDisconnect: ({
    id,
    highlightedComponents,
  }: UserDisconnectedMessage) => void;
  onSelfDisconnected: (event?: any) => void;
  isOnline: () => boolean;
  isConnecting: () => boolean;
  hostRoom: (roomId?: string) => Promise<boolean>;
  joinRoom: (roomId: string, spectateDevice?: string) => Promise<void>;
  disconnect: () => void;
  onUserPositions: ({
    userId,
    originalMessage: { camera, controller1, controller2 },
  }: ForwardedMessage<UserPositionsMessage>) => void;
  setIdToRemoteUser: (value: Map<string, RemoteUser>) => void;
}

export const useCollaborationSessionStore = create<CollaborationSessionState>(
  (set, get) => ({
    idToRemoteUser: new Map(), // tracked
    remoteUserGroup: new THREE.Group(),
    connectionStatus: 'offline', // tracked
    currentRoomId: null, // tracked
    previousRoomId: null, // tracked

    setIdToRemoteUser: (value: Map<string, RemoteUser>) => {
      set({ idToRemoteUser: value });
    },

    getUserCount: () => {
      return get().idToRemoteUser.size + 1;
    },

    _constructor: () => {
      eventEmitter.on(SELF_CONNECTED_EVENT, get().onSelfConnected);
      eventEmitter.on(USER_CONNECTED_EVENT, get().onUserConnected);
      eventEmitter.on(USER_DISCONNECTED_EVENT, get().onUserDisconnect);
      eventEmitter.on(USER_POSITIONS_EVENT, get().onUserPositions);
      eventEmitter.on(SELF_DISCONNECTED_EVENT, get().onSelfDisconnected);
      eventEmitter.on(USER_KICK_EVENT, get().onUserKickEvent);
    },

    // Must be called explicitly in React
    willDestroy: () => {
      eventEmitter.off(SELF_CONNECTED_EVENT, get().onSelfConnected);
      eventEmitter.off(USER_CONNECTED_EVENT, get().onUserConnected);
      eventEmitter.off(USER_DISCONNECTED_EVENT, get().onUserDisconnect);
      eventEmitter.off(USER_POSITIONS_EVENT, get().onUserPositions);
      eventEmitter.off(SELF_DISCONNECTED_EVENT, get().onSelfDisconnected);
      eventEmitter.off(USER_KICK_EVENT, get().onUserKickEvent);
    },

    addRemoteUser: (remoteUser: RemoteUser) => {
      // Make sure that the user does not already exist.
      if (get().idToRemoteUser.has(remoteUser.userId))
        get()._removeRemoteUser(remoteUser);

      let newIdToRemoteUser = new Map(get().idToRemoteUser);
      newIdToRemoteUser.set(remoteUser.userId, remoteUser);
      set({ idToRemoteUser: newIdToRemoteUser });
      let newRemoteUserGroup = get().remoteUserGroup;
      newRemoteUserGroup.add(remoteUser);
      set({ remoteUserGroup: newRemoteUserGroup });
    },

    removeRemoteUserById: (userId: string): RemoteUser | undefined => {
      const remoteUser = get().idToRemoteUser.get(userId);
      if (remoteUser) get()._removeRemoteUser(remoteUser);
      return remoteUser;
    },

    //private
    _removeRemoteUser: (remoteUser: RemoteUser) => {
      // Remove user's 3d-objects.
      remoteUser.removeAllObjects3D();
      let newRemoteUserGroup = get().remoteUserGroup;
      newRemoteUserGroup.remove(remoteUser);
      let newIdToRemoteUser = new Map(get().idToRemoteUser);
      newIdToRemoteUser.delete(remoteUser.userId);
      set({
        remoteUserGroup: newRemoteUserGroup,
        idToRemoteUser: newIdToRemoteUser,
      });
    },

    removeAllRemoteUsers: () => {
      get().idToRemoteUser.forEach((user) => {
        user.removeAllObjects3D();
      });
      set({ idToRemoteUser: new Map() });
    },

    getUserById: (id: string) => {
      if (useLocalUserStore.getState().userId === id) {
        return useLocalUserStore.getState();
      } else {
        return get().idToRemoteUser.get(id);
      }
    },

    getAllRemoteUserIds: () => {
      return get().idToRemoteUser.keys();
    },

    getAllRemoteUsers: () => {
      return get().idToRemoteUser.values();
    },

    lookupRemoteUserById: (userId: string): RemoteUser | undefined => {
      return get().idToRemoteUser.get(userId);
    },

    getColor: (userId: string) => {
      const remoteUser = get().lookupRemoteUserById(userId);
      if (!remoteUser) {
        return `#${useLocalUserStore.getState().color?.getHexString()}`;
      }
      return `#${remoteUser?.color.getHexString()}`;
    },

    /**
     * After succesfully connecting to the backend, create and spawn other users.
     */
    onSelfConnected: ({ self, users }: SelfConnectedMessage): void => {
      // Create User model for all users and add them to the users map by
      // simulating the event of a user connecting.
      users.forEach((userData) => {
        const remoteUser = useUserFactoryStore.getState().createUser({
          userName: userData.name,
          userId: userData.id,
          color: userData.color,
          position: userData.position,
          quaternion: userData.quaternion,
        });
        get().addRemoteUser(remoteUser);
      });

      set({ connectionStatus: 'online' });
      // Initialize local user.
      useLocalUserStore.getState().connected({
        id: self.id,
        name: self.name,
        color: new THREE.Color(
          self.color.red,
          self.color.green,
          self.color.blue
        ),
      });

      // Ensure same settings for all users in collaboration session
      useUserSettingsStore.getState().applyDefaultSettings(false);

      if (get().getUserCount() === 1) {
        useLocalUserStore.setState({ isHost: true });
      }

      useChatStore
        .getState()
        .sendChatMessage(
          self.id,
          `${self.name}(${self.id}) connected to room ${get().currentRoomId}`,
          true,
          'connection_event',
          []
        );
      useToastHandlerStore
        .getState()
        .showSuccessToastMessage('Joined room successfully');
    },

    // Display to other users when another user joins the room
    // Creates remoteUser for this joined user and puts it in the remoteUserGroup
    onUserConnected: ({
      id,
      name,
      color,
      position,
      quaternion,
    }: UserConnectedMessage): void => {
      const remoteUser = useUserFactoryStore.getState().createUser({
        userName: name,
        userId: id,
        color,
        position,
        quaternion,
      });
      get().addRemoteUser(remoteUser);

      useToastHandlerStore
        .getState()
        .showInfoToastMessage(`User connected: ${remoteUser.userName}`);
    },

    onUserKickEvent: ({
      originalMessage,
    }: ForwardedMessage<UserKickEvent>): void => {
      if (useLocalUserStore.getState().userId == originalMessage.userId) {
        useToastHandlerStore
          .getState()
          .showErrorToastMessage('You were kicked');
        get().onSelfDisconnected('kick_event');
      }
    },

    /**
     * Removes the user that disconnected and informs our user about it.
     *
     * @param {JSON} data - Contains the id of the user that disconnected.
     */
    onUserDisconnect: ({
      id,
      highlightedComponents,
    }: UserDisconnectedMessage) => {
      // Remove user and show disconnect notification.
      const removedUser = get().removeRemoteUserById(id);
      if (removedUser) {
        useToastHandlerStore
          .getState()
          .showInfoToastMessage(`User disconnected: ${removedUser.userName}`);
      }

      // walk trough all highlighted entities and unhighlight them
      for (const highlightedEntityComponent of highlightedComponents) {
        const { highlightedApp, highlightedEntity } =
          highlightedEntityComponent;
        // if (highlightedApp !== '') {
        //   const application = useApplicationRendererStore
        //     .getState()
        //     .getApplicationById(highlightedApp);
        //   if (application) {
        //     const mesh = application.getMeshById(highlightedEntity);
        //     if (isEntityMesh(mesh)) {
        //       useHighlightingStore.getState().toggleHighlight(mesh, {
        //         sendMessage: false,
        //       });
        //     }
        //   }
        // } else {
        //   //extern Link
        //   const link = useLinkRendererStore
        //     .getState()
        //     .getLinkById(highlightedEntity);
        //   if (link) {
        //     useHighlightingStore.getState().toggleHighlight(link, {
        //       sendMessage: false,
        //     });
        //   }
        // }
      }
    },

    onSelfDisconnected: (event?: any) => {
      useLocalUserStore.setState({ isHost: false });

      if (get().isConnecting()) {
        useToastHandlerStore
          .getState()
          .showInfoToastMessage(
            'Collaboration backend service not responding.'
          );
      } else if (event) {
        switch (event) {
          case 'io client disconnect':
            useToastHandlerStore
              .getState()
              .showInfoToastMessage('Successfully disconnected');
            break;
          default:
            useToastHandlerStore
              .getState()
              .showErrorToastMessage('Unexpected disconnect');
        }
      }

      // Remove remote users.
      get().removeAllRemoteUsers();

      // TODO:
      // useHighlightingStore.getState().resetColorsOfHighlightedEntities();

      // useHighlightingStore.getState().updateHighlighting();

      useChatStore
        .getState()
        .sendChatMessage(
          useLocalUserStore.getState().userId,
          `${useLocalUserStore.getState().userName}(${useLocalUserStore.getState().userId}) disconnected from room ${get().previousRoomId}`,
          true,
          'disconnection_event',
          []
        );
    },

    isOnline: () => {
      return get().connectionStatus === 'online';
    },

    isConnecting: () => {
      return get().connectionStatus === 'connecting';
    },

    hostRoom: async (roomId = '') => {
      if (!get().isConnecting() && !get().isOnline()) {
        try {
          const response = await useRoomServiceStore
            .getState()
            .createRoom(roomId);
          get().joinRoom(response.roomId);
          return true;
        } catch (e: any) {
          // this.connectionStatus = 'offline';
          useToastHandlerStore
            .getState()
            .showErrorToastMessage('Cannot reach Collaboration-Service.');
          return false;
        }
      } else {
        return false;
      }
    },

    joinRoom: async (roomId: string, spectateDevice: string = 'default') => {
      if (get().isConnecting()) {
        useToastHandlerStore
          .getState()
          .showErrorToastMessage(
            'Tried to join room while already connecting to a room.'
          );
        return;
      }

      const rooms = await useRoomServiceStore.getState().listRooms();
      const room = rooms.find((room) => room.roomId === roomId);
      if (!room) {
        useToastHandlerStore
          .getState()
          .showErrorToastMessage('Could not find room with ID ' + roomId);
        return;
      }

      const tokens = await useLandscapeTokenStore.getState().retrieveTokens();
      const token = tokens.find((elem) => elem.value === room.landscapeToken);

      if (token) {
        useLandscapeTokenStore.getState().setToken(token);
        useRouterStore.getState().navigateTo!({
          pathname: '/visualization',
          search: `?${createSearchParams({
            landscapeToken: token.value,
            roomId: roomId,
            deviceId: spectateDevice !== undefined ? spectateDevice : 'default',
          })}`,
        });
      } else {
        useToastHandlerStore
          .getState()
          .showErrorToastMessage(
            'Could not find landscape token for room to join.'
          );
        return;
      }

      set({ connectionStatus: 'connecting' });
      set({ currentRoomId: roomId });

      const delay = 100;
      const maxRetries = 5; // Maximum number of retry attempts
      let retries = 0;
      while (retries < maxRetries) {
        try {
          const response = await useRoomServiceStore
            .getState()
            .joinLobby(get().currentRoomId!);
          useWebSocketStore
            .getState()
            .initSocket(
              response.ticketId,
              useLocalUserStore.getState().visualizationMode
            );
          break; // Break out of the loop if successful
        } catch (e) {
          if (retries === maxRetries - 1) {
            // If this is the last retry attempt, handle the error and break out of the loop
            set({ connectionStatus: 'offline' });
            set({ currentRoomId: null });
            useToastHandlerStore
              .getState()
              .showErrorToastMessage(
                'Cannot reach Collaboration-Service after multiple retries.'
              );
            break;
          }
          retries++;
          console.error('Error: Unable to join lobby. Retrying...', e);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    },

    /**
     * Switch to offline mode, close socket connection
     */
    disconnect: () => {
      if (get().connectionStatus != 'offline') {
        set({ previousRoomId: get().currentRoomId });
      }

      set({ connectionStatus: 'offline', currentRoomId: null });
      useWebSocketStore.getState().closeSocket();
    },

    /**
     * Updates the specified user's camera and controller positions.
     */
    onUserPositions: ({
      userId,
      originalMessage: { camera, controller1, controller2 },
    }: ForwardedMessage<UserPositionsMessage>): void => {
      const remoteUser = get().lookupRemoteUserById(userId);
      if (!remoteUser) return;
      if (controller1)
        remoteUser.updateController(CONTROLLER_1_ID, controller1);
      if (controller2)
        remoteUser.updateController(CONTROLLER_2_ID, controller2);
      if (camera) {
        remoteUser.updateCamera(camera);
        useMinimapStore
          .getState()
          .updateUserMinimapMarker(
            remoteUser.camera!.model.position,
            userId,
            remoteUser
          );
      }
    },
  })
);

useCollaborationSessionStore.getState()._constructor();
