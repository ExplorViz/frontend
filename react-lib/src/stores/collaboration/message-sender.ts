import { create } from 'zustand';
import { AllHighlightsResetMessage } from 'react-lib/src/utils/collaboration/web-socket-messages/sendable/all-highlights-reset';
import {
  CHANGE_LANDSCAPE_EVENT,
  ChangeLandscapeMessage,
} from 'react-lib/src/utils/collaboration/web-socket-messages/sendable/change-landscape';
import {
  CHANGELOG_REMOVE_ENTRY_EVENT,
  CHANGELOG_RESTORE_ENTRIES_EVENT,
  ChangeLogRemoveEntryMessage,
  ChangeLogRestoreEntriesMessage,
} from 'react-lib/src/utils/collaboration/web-socket-messages/sendable/changelog-update';
import {
  PING_UPDATE_EVENT,
  PingUpdateMessage,
} from 'react-lib/src/utils/collaboration/web-socket-messages/sendable/ping-update';
import {
  CHAT_MESSAGE_EVENT,
  ChatMessage,
} from 'react-lib/src/utils/collaboration/web-socket-messages/sendable/chat-message';
import {
  CHAT_SYNC_EVENT,
  ChatSynchronizeMessage,
} from 'react-lib/src/utils/collaboration/web-socket-messages/sendable/chat-syncronization';
import {
  USER_MUTE_EVENT,
  UserMuteUpdate,
} from 'react-lib/src/utils/collaboration/web-socket-messages/sendable/mute-update';
import {
  SHARE_SETTINGS_EVENT,
  ShareSettingsMessage,
} from 'react-lib/src/utils/collaboration/web-socket-messages/sendable/share-settings';
import {
  TIMESTAMP_UPDATE_EVENT,
  TimestampUpdateMessage,
} from 'react-lib/src/utils/collaboration/web-socket-messages/sendable/timestamp-update';
import { ControllerId } from 'react-lib/src/utils/collaboration/web-socket-messages/types/controller-id';
import {
  EntityType,
  RestructureAction,
} from 'react-lib/src/utils/restructure-helper';
import { default as VRController } from 'react-lib/src/utils/extended-reality/vr-controller';
import { getControllerPose } from 'react-lib/src/utils/extended-reality/vr-helpers/vr-poses';
import { JoinVrMessage } from 'react-lib/src/utils/extended-reality/vr-web-wocket-messages/sendable/join-vr';
import {
  OBJECT_MOVED_EVENT,
  ObjectMovedMessage,
} from 'react-lib/src/utils/extended-reality/vr-web-wocket-messages/sendable/object-moved';
import {
  OBJECT_RELEASED_EVENT,
  ObjectReleasedMessage,
} from 'react-lib/src/utils/extended-reality/vr-web-wocket-messages/sendable/object-released';
import {
  USER_CONTROLLER_CONNECT_EVENT,
  UserControllerConnectMessage,
} from 'react-lib/src/utils/extended-reality/vr-web-wocket-messages/sendable/user-controller-connect';
import {
  USER_CONTROLLER_DISCONNECT_EVENT,
  UserControllerDisconnectMessage,
} from 'react-lib/src/utils/extended-reality/vr-web-wocket-messages/sendable/user-controller-disconnect';
import {
  ControllerPose,
  Pose,
  USER_POSITIONS_EVENT,
  UserPositionsMessage,
} from 'react-lib/src/utils/extended-reality/vr-web-wocket-messages/sendable/user-positions';
import * as THREE from 'three';
import { useWebSocketStore } from 'react-lib/src/stores/collaboration/web-socket';
import {
  COMPONENT_UPDATE_EVENT,
  ComponentUpdateMessage,
} from 'react-lib/src/utils/collaboration/web-socket-messages/sendable/component-update';
import {
  HIGHLIGHTING_UPDATE_EVENT,
  HighlightingUpdateMessage,
} from 'react-lib/src/utils/collaboration/web-socket-messages/sendable/highlighting-update';
import {
  MOUSE_PING_UPDATE_EVENT,
  MousePingUpdateMessage,
} from 'react-lib/src/utils/collaboration/web-socket-messages/sendable/mouse-ping-update';
import {
  RESTRUCTURE_COMMUNICATION_EVENT,
  RESTRUCTURE_COPY_AND_PASTE_CLASS_EVENT,
  RESTRUCTURE_COPY_AND_PASTE_PACKAGE_EVENT,
  RESTRUCTURE_CREATE_OR_DELETE_EVENT,
  RESTRUCTURE_CUT_AND_INSERT_EVENT,
  RESTRUCTURE_DELETE_COMMUNICATION_EVENT,
  RESTRUCTURE_DUPLICATE_APP,
  RESTRUCTURE_MODE_UPDATE_EVENT,
  RESTRUCTURE_RENAME_OPERATION_EVENT,
  RESTRUCTURE_RESTORE_APP_EVENT,
  RESTRUCTURE_RESTORE_CLASS_EVENT,
  RESTRUCTURE_RESTORE_PACKAGE_EVENT,
  RESTRUCTURE_UPDATE_EVENT,
  RestructureCommunicationMessage,
  RestructureCopyAndPasteClassMessage,
  RestructureCopyAndPastePackageMessage,
  RestructureCreateOrDeleteMessage,
  RestructureCutAndInsertMessage,
  RestructureDeleteCommunicationMessage,
  RestructureDuplicateAppMessage,
  RestructureModeUpdateMessage,
  RestructureRenameOperationMessage,
  RestructureRestoreAppMessage,
  RestructureRestoreClassMessage,
  RestructureRestorePackageMessage,
  RestructureUpdateMessage,
} from 'react-lib/src/utils/collaboration/web-socket-messages/sendable/restructure-update';
import {
  SPECTATING_UPDATE_EVENT,
  SpectatingUpdateMessage,
} from 'react-lib/src/utils/collaboration/web-socket-messages/sendable/spectating-update';
import {
  SYNC_ROOM_STATE_EVENT,
  SyncRoomStateMessage,
} from 'react-lib/src/utils/collaboration/web-socket-messages/sendable/synchronize-room-state';
import { SerializedRoom } from 'react-lib/src/utils/collaboration/web-socket-messages/types/serialized-room';
import {
  USER_KICK_EVENT,
  UserKickEvent,
} from 'react-lib/src/utils/collaboration/web-socket-messages/sendable/kick-user';
import {
  MESSAGE_DELETE_EVENT,
  MessageDeleteEvent,
} from 'react-lib/src/utils/collaboration/web-socket-messages/sendable/delete-message';
import { VisualizationSettings } from 'react-lib/src/utils/settings/settings-schemas';

// TODO: This could probably be a utility
// But for migration reasons, its first implemented as store.

interface MessageSenderState {
  sendPoseUpdate: (
    camera: Pose,
    controller1?: ControllerPose | undefined,
    controller2?: ControllerPose | undefined
  ) => void;
  sendChangeLandscape: (landscapeToken: string) => void;
  sendAllHighlightsReset: () => void;
  sendObjectMoved: (
    objectId: string,
    position: THREE.Vector3,
    quaternion: THREE.Quaternion,
    scale: THREE.Vector3
  ) => void;
  sendObjectReleased: (objectId: string) => void;
  sendComponentUpdate: (
    appId: string,
    componentId: string,
    isOpened: boolean,
    isFoundation: boolean,
    forward?: boolean
  ) => void;
  sendHighlightingUpdate: (
    appId: string,
    entityType: string,
    entityId: string,
    isHighlighted: boolean,
    isMultiSelected: boolean
  ) => void;
  sendSharedSettings: (settings: VisualizationSettings) => void;
  sendRestructureModeUpdate: () => void;
  sendRestructureUpdate: (
    entityType: EntityType,
    entityId: string,
    newName: string,
    appId: string | null,
    undo: boolean
  ) => void;
  sendRestructureCreateOrDeleteMessage: (
    entityType: EntityType,
    action: RestructureAction,
    name: string | null,
    language: string | null,
    entityId: string | null,
    undo: boolean
  ) => void;
  sendRestructureDuplicateAppMessage: (appId: string) => void;
  sendRestructureCopyAndPastePackageMessage: (
    destinationEntity: string,
    destinationId: string,
    clippedEntityId: string
  ) => void;
  sendRestructureCopyAndPasteClassMessage: (
    destinationId: string,
    clippedEntityId: string
  ) => void;
  sendRestructureCutAndInsertMessage: (
    destinationEntity: string,
    destinationId: string,
    clippedEntity: string,
    clippedEntityId: string
  ) => void;
  sendRestructureCommunicationMessage: (
    sourceClassId: string,
    targetClassId: string,
    methodName: string
  ) => void;
  sendRestructureDeleteCommunicationMessage: (
    undo: boolean,
    commId: string
  ) => void;
  sendRestructureRenameOperationMessage: (
    commId: string,
    newName: string,
    undo: boolean
  ) => void;
  sendRestructureRestoreAppMessage: (
    appId: string,
    undoCutOperation: boolean
  ) => void;
  sendRestructureRestorePackageMessage: (
    pckgId: string,
    undoCutOperation: boolean
  ) => void;
  sendRestructureRestoreClassMessage: (
    appId: string,
    clazzId: string,
    undoCutOperation: boolean
  ) => void;
  sendChangeLogRestoreEntriesMessage: (key: string) => void;
  sendChangeLogRemoveEntryMessage: (entryIds: string[]) => void;
  sendSpectatingUpdate: (
    isSpectating: boolean,
    spectatedUserId: string,
    spectatingUserIds: string[],
    configurationId: string
  ) => void;
  sendSyncRoomState: (room: SerializedRoom | null) => void;
  sendControllerConnect: (
    controller: VRController | undefined
  ) => Promise<void>;
  sendJoinVr: () => Promise<void>;
  sendControllerDisconnect: (controller: VRController) => void;
  sendPingUpdate: (controllerId: ControllerId, isPinging: boolean) => void;
  sendMousePingUpdate: (
    modelId: string,
    isApplication: boolean,
    position: THREE.Vector3
  ) => void;
  sendTimestampUpdate: (timestamp: number) => void;
  sendChatMessage: (
    userId: string,
    msg: string,
    userName: string,
    timestamp: string,
    isEvent: boolean,
    eventType: string,
    eventData: any[]
  ) => void;
  sendChatSynchronize: () => void;
  sendUserMuteUpdate: (userId: string) => void;
  sendKickUser: (userId: string) => void;
  sendMessageDelete: (msgId: number[]) => void;
}

export const useMessageSenderStore = create<MessageSenderState>((set, get) => ({
  /**
   * Sends position and rotation information of the local user's camera and
   * controllers.
   */
  sendPoseUpdate: (
    camera: Pose,
    controller1?: ControllerPose | undefined,
    controller2?: ControllerPose | undefined
  ) => {
    useWebSocketStore
      .getState()
      .send<UserPositionsMessage>(USER_POSITIONS_EVENT, {
        event: USER_POSITIONS_EVENT,
        controller1,
        controller2,
        camera,
      });
  },

  sendChangeLandscape: (landscapeToken: string) => {
    useWebSocketStore
      .getState()
      .send<ChangeLandscapeMessage>(CHANGE_LANDSCAPE_EVENT, {
        event: CHANGE_LANDSCAPE_EVENT,
        landscapeToken,
      });
  },

  /**
   * Sends a message to indicate that every highlight from every user for all applications should be turned unhighlighted
   */
  sendAllHighlightsReset: () => {
    useWebSocketStore
      .getState()
      .send<AllHighlightsResetMessage>('all_highlights_reset', {
        event: 'all_highlights_reset',
      });
  },

  /**
   * Sends the position and rotation of a grabbed object to the backend.
   *
   * @param objectId The id of the grabbed object.
   * @param position The new position of the grabbed object in world coordinates.
   * @param quaternion The new rotation of the grabbed object in world coordinates.
   */
  sendObjectMoved: (
    objectId: string,
    position: THREE.Vector3,
    quaternion: THREE.Quaternion,
    scale: THREE.Vector3
  ) => {
    useWebSocketStore.getState().send<ObjectMovedMessage>(OBJECT_MOVED_EVENT, {
      event: OBJECT_MOVED_EVENT,
      objectId,
      position: position.toArray(),
      quaternion: quaternion.toArray(),
      scale: scale.toArray(),
    });
  },

  /**
   * Sends a message to the backend that notifies it that the object with the
   * given id has been released and can be grabbed by another user.
   *
   * @param objectId The id of the object to request to grab.
   */
  sendObjectReleased: (objectId: string) => {
    useWebSocketStore
      .getState()
      .send<ObjectReleasedMessage>(OBJECT_RELEASED_EVENT, {
        event: OBJECT_RELEASED_EVENT,
        objectId,
      });
  },

  /**
   * Informs the backend that a component was opened or closed by this user.
   *
   * @param {string} appId ID of the app which is a parent to the component
   * @param {string} componentId ID of the component which was opened or closed
   * @param {boolean} isOpened Tells whether the component is now open or closed (current state)
   */
  sendComponentUpdate: (
    appId: string,
    componentId: string,

    isOpened: boolean,
    isFoundation: boolean,
    forward: boolean = true
  ) => {
    useWebSocketStore
      .getState()
      .send<ComponentUpdateMessage>(COMPONENT_UPDATE_EVENT, {
        event: COMPONENT_UPDATE_EVENT,
        appId,
        componentId,
        isOpened,
        isFoundation,
        forward,
      });
  },

  /**
   * Informs the backend that an entity (clazz or component) was highlighted
   * or unhighlighted.
   *
   * @param {string} appId ID of the parent application of the entity
   * @param {string} entityType Tells whether a clazz/component or communication was updated
   * @param {string} entityId ID of the highlighted/unhighlighted component/clazz
   * @param {boolean} isHighlighted Tells whether the entity has been highlighted or not
   */
  sendHighlightingUpdate: (
    appId: string,
    entityType: string,
    entityId: string,
    isHighlighted: boolean,
    isMultiSelected: boolean
  ) => {
    useWebSocketStore
      .getState()
      .send<HighlightingUpdateMessage>(HIGHLIGHTING_UPDATE_EVENT, {
        event: HIGHLIGHTING_UPDATE_EVENT,
        appId,
        entityType,
        entityId,
        isHighlighted,
        multiSelected: isMultiSelected,
      });
  },

  sendSharedSettings: (settings: VisualizationSettings) => {
    useWebSocketStore
      .getState()
      .send<ShareSettingsMessage>(SHARE_SETTINGS_EVENT, {
        event: SHARE_SETTINGS_EVENT,
        settings,
      });
  },

  sendRestructureModeUpdate: () => {
    useWebSocketStore
      .getState()
      .send<RestructureModeUpdateMessage>(RESTRUCTURE_MODE_UPDATE_EVENT, {
        event: RESTRUCTURE_MODE_UPDATE_EVENT,
      });
  },

  sendRestructureUpdate: (
    entityType: EntityType,
    entityId: string,
    newName: string,
    appId: string | null,
    undo: boolean
  ) => {
    useWebSocketStore
      .getState()
      .send<RestructureUpdateMessage>(RESTRUCTURE_UPDATE_EVENT, {
        event: RESTRUCTURE_UPDATE_EVENT,
        entityType: entityType,
        entityId: entityId,
        newName: newName,
        appId: appId,
        undo: undo,
      });
  },

  sendRestructureCreateOrDeleteMessage: (
    entityType: EntityType,
    action: RestructureAction,
    name: string | null,
    language: string | null,
    entityId: string | null,
    undo: boolean
  ) => {
    useWebSocketStore
      .getState()
      .send<RestructureCreateOrDeleteMessage>(
        RESTRUCTURE_CREATE_OR_DELETE_EVENT,
        {
          event: RESTRUCTURE_CREATE_OR_DELETE_EVENT,
          action: action,
          entityType: entityType,
          name: name,
          language: language,
          entityId: entityId,
          undo: undo,
        }
      );
  },

  sendRestructureDuplicateAppMessage: (appId: string) => {
    useWebSocketStore
      .getState()
      .send<RestructureDuplicateAppMessage>(RESTRUCTURE_DUPLICATE_APP, {
        event: RESTRUCTURE_DUPLICATE_APP,
        appId: appId,
      });
  },

  sendRestructureCopyAndPastePackageMessage: (
    destinationEntity: string,
    destinationId: string,
    clippedEntityId: string
  ) => {
    useWebSocketStore
      .getState()
      .send<RestructureCopyAndPastePackageMessage>(
        RESTRUCTURE_COPY_AND_PASTE_PACKAGE_EVENT,
        {
          event: RESTRUCTURE_COPY_AND_PASTE_PACKAGE_EVENT,
          destinationEntity: destinationEntity,
          destinationId: destinationId,
          clippedEntityId: clippedEntityId,
        }
      );
  },

  sendRestructureCopyAndPasteClassMessage: (
    destinationId: string,
    clippedEntityId: string
  ) => {
    useMessageSenderStore
      .getState()
      .send<RestructureCopyAndPasteClassMessage>(
        RESTRUCTURE_COPY_AND_PASTE_CLASS_EVENT,
        {
          event: RESTRUCTURE_COPY_AND_PASTE_CLASS_EVENT,
          destinationId: destinationId,
          clippedEntityId: clippedEntityId,
        }
      );
  },

  sendRestructureCutAndInsertMessage: (
    destinationEntity: string,
    destinationId: string,
    clippedEntity: string,
    clippedEntityId: string
  ) => {
    useWebSocketStore
      .getState()
      .send<RestructureCutAndInsertMessage>(RESTRUCTURE_CUT_AND_INSERT_EVENT, {
        event: RESTRUCTURE_CUT_AND_INSERT_EVENT,
        destinationEntity: destinationEntity,
        destinationId: destinationId,
        clippedEntity: clippedEntity,
        clippedEntityId: clippedEntityId,
      });
  },

  sendRestructureCommunicationMessage: (
    sourceClassId: string,
    targetClassId: string,
    methodName: string
  ) => {
    useMessageSenderStore
      .getState()
      .send<RestructureCommunicationMessage>(RESTRUCTURE_COMMUNICATION_EVENT, {
        event: RESTRUCTURE_COMMUNICATION_EVENT,
        sourceClassId: sourceClassId,
        targetClassId: targetClassId,
        methodName: methodName,
      });
  },

  sendRestructureDeleteCommunicationMessage: (
    undo: boolean,
    commId: string
  ) => {
    useWebSocketStore
      .getState()
      .send<RestructureDeleteCommunicationMessage>(
        RESTRUCTURE_DELETE_COMMUNICATION_EVENT,
        {
          event: RESTRUCTURE_DELETE_COMMUNICATION_EVENT,
          undo: undo,
          commId: commId,
        }
      );
  },

  sendRestructureRenameOperationMessage: (
    commId: string,
    newName: string,
    undo: boolean
  ) => {
    useWebSocketStore
      .getState()
      .send<RestructureRenameOperationMessage>(
        RESTRUCTURE_RENAME_OPERATION_EVENT,
        {
          event: RESTRUCTURE_RENAME_OPERATION_EVENT,
          commId: commId,
          newName: newName,
          undo: undo,
        }
      );
  },

  sendRestructureRestoreAppMessage: (
    appId: string,
    undoCutOperation: boolean
  ) => {
    useWebSocketStore
      .getState()
      .send<RestructureRestoreAppMessage>(RESTRUCTURE_RESTORE_APP_EVENT, {
        event: RESTRUCTURE_RESTORE_APP_EVENT,
        appId: appId,
        undoCutOperation: undoCutOperation,
      });
  },

  sendRestructureRestorePackageMessage: (
    pckgId: string,
    undoCutOperation: boolean
  ) => {
    useWebSocketStore
      .getState()
      .send<RestructureRestorePackageMessage>(
        RESTRUCTURE_RESTORE_PACKAGE_EVENT,
        {
          event: RESTRUCTURE_RESTORE_PACKAGE_EVENT,
          pckgId: pckgId,
          undoCutOperation: undoCutOperation,
        }
      );
  },

  sendRestructureRestoreClassMessage: (
    appId: string,
    clazzId: string,
    undoCutOperation: boolean
  ) => {
    useWebSocketStore
      .getState()
      .send<RestructureRestoreClassMessage>(RESTRUCTURE_RESTORE_CLASS_EVENT, {
        event: RESTRUCTURE_RESTORE_CLASS_EVENT,
        appId: appId,
        clazzId: clazzId,
        undoCutOperation: undoCutOperation,
      });
  },

  sendChangeLogRestoreEntriesMessage: (key: string) => {
    useWebSocketStore
      .getState()
      .send<ChangeLogRestoreEntriesMessage>(CHANGELOG_RESTORE_ENTRIES_EVENT, {
        event: CHANGELOG_RESTORE_ENTRIES_EVENT,
        key: key,
      });
  },

  sendChangeLogRemoveEntryMessage: (entryIds: string[]) => {
    useWebSocketStore
      .getState()
      .send<ChangeLogRemoveEntryMessage>(CHANGELOG_REMOVE_ENTRY_EVENT, {
        event: CHANGELOG_REMOVE_ENTRY_EVENT,
        entryIds: entryIds,
      });
  },

  /**
   * Informs backend that this user entered or left spectating mode and
   * additionally adds who is spectating who.
   */
  sendSpectatingUpdate: (
    isSpectating: boolean,
    spectatedUserId: string,
    spectatingUserIds: string[],
    configurationId = 'default'
  ) => {
    useWebSocketStore
      .getState()
      .send<SpectatingUpdateMessage>(SPECTATING_UPDATE_EVENT, {
        event: 'spectating_update',
        isSpectating,
        spectatedUserId,
        spectatingUserIds,
        configurationId,
        configuration: { id: configurationId, devices: null },
      });
  },

  sendSyncRoomState: (room: SerializedRoom | null) => {
    if (!room) {
      return;
    }
    useWebSocketStore
      .getState()
      .send<SyncRoomStateMessage>(SYNC_ROOM_STATE_EVENT, {
        event: SYNC_ROOM_STATE_EVENT,
        landscape: room.landscape,
        openApps: room.openApps.map(({ ...app }) => app),
        highlightedExternCommunicationLinks:
          room.highlightedExternCommunicationLinks,
        popups: room.popups.map(({ ...popup }) => popup),
        annotations: room.annotations!.map(({ ...annotation }) => annotation),
        detachedMenus: room.detachedMenus.map(({ ...menu }) => menu),
      });
  },

  /**
   * Informs the backend if a controller was connected/disconnected.
   */
  sendControllerConnect: async (controller: VRController | undefined) => {
    if (!controller?.connected) return;

    const motionController =
      await controller.controllerModel.motionControllerPromise;
    useWebSocketStore
      .getState()
      .send<UserControllerConnectMessage>(USER_CONTROLLER_CONNECT_EVENT, {
        event: 'user_controller_connect',
        controller: {
          assetUrl: motionController.assetUrl,
          controllerId: controller.gamepadIndex,
          ...getControllerPose(controller),
        },
      });
  },

  sendJoinVr: async () => {
    useWebSocketStore.getState().send<JoinVrMessage>('join_vr', {
      event: 'join_vr',
    });
  },

  /**
   * Informs the backend if a controller was connected/disconnected.
   */
  sendControllerDisconnect: (controller: VRController) => {
    useWebSocketStore
      .getState()
      .send<UserControllerDisconnectMessage>(USER_CONTROLLER_DISCONNECT_EVENT, {
        event: 'user_controller_disconnect',
        controllerId: controller.gamepadIndex,
      });
  },

  sendPingUpdate: (controllerId: ControllerId, isPinging: boolean) => {
    useWebSocketStore.getState().send<PingUpdateMessage>(PING_UPDATE_EVENT, {
      event: 'ping_update',
      controllerId,
      isPinging,
    });
  },

  sendMousePingUpdate: (
    modelId: string,
    isApplication: boolean,
    position: THREE.Vector3
  ) => {
    useWebSocketStore
      .getState()
      .send<MousePingUpdateMessage>(MOUSE_PING_UPDATE_EVENT, {
        event: 'mouse_ping_update',
        modelId,
        isApplication,
        position: position.toArray(),
      });
  },

  sendTimestampUpdate: (timestamp: number) => {
    useWebSocketStore
      .getState()
      .send<TimestampUpdateMessage>(TIMESTAMP_UPDATE_EVENT, {
        event: 'timestamp_update',
        timestamp,
      });
  },

  sendChatMessage: (
    userId: string,
    msg: string,
    userName: string,
    timestamp: string,
    isEvent: boolean,
    eventType: string,
    eventData: any[]
  ) => {
    useWebSocketStore.getState().send<ChatMessage>(CHAT_MESSAGE_EVENT, {
      event: 'chat_message',
      userId,
      msg,
      userName,
      timestamp,
      isEvent,
      eventType,
      eventData,
    });
  },

  sendChatSynchronize: () => {
    useWebSocketStore.getState().send<ChatSynchronizeMessage>(CHAT_SYNC_EVENT, {
      event: 'chat_synchronization',
    });
  },

  sendUserMuteUpdate: (userId: string) => {
    useWebSocketStore.getState().send<UserMuteUpdate>(USER_MUTE_EVENT, {
      event: 'user_mute_update',
      userId,
    });
  },

  sendKickUser: (userId: string) => {
    useWebSocketStore.getState().send<UserKickEvent>(USER_KICK_EVENT, {
      event: 'user_kick_event',
      userId,
    });
  },

  sendMessageDelete: (msgId: number[]) => {
    useWebSocketStore
      .getState()
      .send<MessageDeleteEvent>(MESSAGE_DELETE_EVENT, {
        event: 'message_delete_event',
        msgIds: msgId,
      });
  },
}));
