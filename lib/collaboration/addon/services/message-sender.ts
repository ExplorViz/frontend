import Service, { inject as service } from '@ember/service';
import ApplicationObject3D from 'explorviz-frontend/view-objects/3d/application/application-object-3d';
import * as THREE from 'three';
import WebSocketService from '../services/web-socket';
import {
  MOUSE_PING_UPDATE_EVENT,
  MousePingUpdateMessage,
} from '../utils/web-socket-messages/sendable/mouse-ping-update';
import {
  APP_OPENED_EVENT,
  AppOpenedMessage,
} from '../utils/web-socket-messages/sendable/app-opened';
import {
  COMPONENT_UPDATE_EVENT,
  ComponentUpdateMessage,
} from '../utils/web-socket-messages/sendable/component-update';
import {
  HIGHLIGHTING_UPDATE_EVENT,
  HighlightingUpdateMessage,
} from '../utils/web-socket-messages/sendable/highlighting-update';
import {
  SPECTATING_UPDATE_EVENT,
  SpectatingUpdateMessage,
} from '../utils/web-socket-messages/sendable/spectating-update';
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
} from '../utils/web-socket-messages/sendable/restructure-update';
import {
  RestructureAction,
  EntityType,
} from 'explorviz-frontend/utils/restructure-helper';
import { AllHighlightsResetMessage } from 'collaboration/utils/web-socket-messages/sendable/all-highlights-reset';
import {
  ControllerPose,
  Pose,
  UserPositionsMessage,
} from 'extended-reality/utils/vr-web-wocket-messages/sendable/user-positions';
import {
  OBJECT_MOVED_EVENT,
  ObjectMovedMessage,
} from 'extended-reality/utils/vr-web-wocket-messages/sendable/object-moved';
import {
  OBJECT_RELEASED_EVENT,
  ObjectReleasedMessage,
} from 'extended-reality/utils/vr-web-wocket-messages/sendable/object-released';
import { ControllerId } from 'collaboration/utils/web-socket-messages/types/controller-id';
import { JoinVrMessage } from 'extended-reality/utils/vr-web-wocket-messages/sendable/join-vr';
import { getControllerPose } from 'extended-reality/utils/vr-helpers/vr-poses';
import VRController from 'extended-reality/utils/vr-controller';
import {
  USER_CONTROLLER_DISCONNECT_EVENT,
  UserControllerDisconnectMessage,
} from 'extended-reality/utils/vr-web-wocket-messages/sendable/user-controller-disconnect';
import {
  PING_UPDATE_EVENT,
  PingUpdateMessage,
} from 'collaboration/utils/web-socket-messages/sendable/ping-update';
import {
  TIMESTAMP_UPDATE_EVENT,
  TimestampUpdateMessage,
} from 'collaboration/utils/web-socket-messages/sendable/timetsamp-update';
import {
  USER_CONTROLLER_CONNECT_EVENT,
  UserControllerConnectMessage,
} from 'extended-reality/utils/vr-web-wocket-messages/sendable/user-controller-connect';
import {
  CHANGELOG_REMOVE_ENTRY_EVENT,
  CHANGELOG_RESTORE_ENTRIES_EVENT,
  ChangeLogRemoveEntryMessage,
  ChangeLogRestoreEntriesMessage,
} from 'collaboration/utils/web-socket-messages/sendable/changelog-update';

export default class MessageSender extends Service {
  @service('web-socket')
  private webSocket!: WebSocketService;

  /**
   * Gets the next request identifier.
   *
   * Messages that await responses
   */

  /**
   * Sends position and rotation information of the local user's camera and
   * controllers.
   */
  sendPoseUpdate(
    camera: Pose,
    controller1?: ControllerPose | undefined,
    controller2?: ControllerPose | undefined
  ) {
    this.webSocket.send<UserPositionsMessage>('user_positions', {
      event: 'user_positions',
      controller1,
      controller2,
      camera,
    });
  }

  /**
   * Sends a message to indicate that every highlight from every user for all applications should be turned unhighlighted
   */
  sendAllHighlightsReset() {
    this.webSocket.send<AllHighlightsResetMessage>('all_highlights_reset', {
      event: 'all_highlights_reset',
    });
  }

  /**
   * Sends the position and rotation of a grabbed object to the backend.
   *
   * @param objectId The id of the grabbed object.
   * @param position The new position of the grabbed object in world coordinates.
   * @param quaternion The new rotation of the grabbed object in world coordinates.
   */
  sendObjectMoved(
    objectId: string,
    position: THREE.Vector3,
    quaternion: THREE.Quaternion,
    scale: THREE.Vector3
  ) {
    this.webSocket.send<ObjectMovedMessage>(OBJECT_MOVED_EVENT, {
      event: OBJECT_MOVED_EVENT,
      objectId,
      position: position.toArray(),
      quaternion: quaternion.toArray(),
      scale: scale.toArray(),
    });
  }

  /**
   * Sends a message to the backend that notifies it that the object with the
   * given id has been released and can be grabbed by another user.
   *
   * @param objectId The id of the object to request to grab.
   */
  sendObjectReleased(objectId: string) {
    this.webSocket.send<ObjectReleasedMessage>(OBJECT_RELEASED_EVENT, {
      event: OBJECT_RELEASED_EVENT,
      objectId,
    });
  }

  /**
   * Informs the backend that a component was opened or closed by this user.
   *
   * @param {string} appId ID of the app which is a parent to the component
   * @param {string} componentId ID of the component which was opened or closed
   * @param {boolean} isOpened Tells whether the component is now open or closed (current state)
   */
  sendComponentUpdate(
    appId: string,
    componentId: string,

    isOpened: boolean,
    isFoundation: boolean,
    forward: boolean = true
  ) {
    this.webSocket.send<ComponentUpdateMessage>(COMPONENT_UPDATE_EVENT, {
      event: COMPONENT_UPDATE_EVENT,
      appId,
      componentId,
      isOpened,
      isFoundation,
      forward,
    });
  }

  /**
   * Informs the backend that an entity (clazz or component) was highlighted
   * or unhighlighted.
   *
   * @param {string} appId ID of the parent application of the entity
   * @param {string} entityType Tells whether a clazz/component or communication was updated
   * @param {string} entityId ID of the highlighted/unhighlighted component/clazz
   * @param {boolean} isHighlighted Tells whether the entity has been highlighted or not
   */
  sendHighlightingUpdate(
    appId: string,
    entityType: string,
    entityId: string,
    isHighlighted: boolean,
    isMultiSelected: boolean
  ) {
    this.webSocket.send<HighlightingUpdateMessage>(HIGHLIGHTING_UPDATE_EVENT, {
      event: HIGHLIGHTING_UPDATE_EVENT,
      appId,
      entityType,
      entityId,
      isHighlighted,
      multiSelected: isMultiSelected,
    });
  }

  sendRestructureModeUpdate() {
    this.webSocket.send<RestructureModeUpdateMessage>(
      RESTRUCTURE_MODE_UPDATE_EVENT,
      {
        event: RESTRUCTURE_MODE_UPDATE_EVENT,
      }
    );
  }

  sendRestructureUpdate(
    entityType: EntityType,
    entityId: string,
    newName: string,
    appId: string | null,
    undo: boolean
  ) {
    this.webSocket.send<RestructureUpdateMessage>(RESTRUCTURE_UPDATE_EVENT, {
      event: RESTRUCTURE_UPDATE_EVENT,
      entityType: entityType,
      entityId: entityId,
      newName: newName,
      appId: appId,
      undo: undo,
    });
  }

  sendRestructureCreateOrDeleteMessage(
    entityType: EntityType,
    action: RestructureAction,
    name: string | null,
    language: string | null,
    entityId: string | null,
    undo: boolean
  ) {
    this.webSocket.send<RestructureCreateOrDeleteMessage>(
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
  }

  sendRestructureDuplicateAppMessage(appId: string) {
    this.webSocket.send<RestructureDuplicateAppMessage>(
      RESTRUCTURE_DUPLICATE_APP,
      {
        event: RESTRUCTURE_DUPLICATE_APP,
        appId: appId,
      }
    );
  }

  sendRestructureCopyAndPastePackageMessage(
    destinationEntity: string,
    destinationId: string,
    clippedEntityId: string
  ) {
    this.webSocket.send<RestructureCopyAndPastePackageMessage>(
      RESTRUCTURE_COPY_AND_PASTE_PACKAGE_EVENT,
      {
        event: RESTRUCTURE_COPY_AND_PASTE_PACKAGE_EVENT,
        destinationEntity: destinationEntity,
        destinationId: destinationId,
        clippedEntityId: clippedEntityId,
      }
    );
  }

  sendRestructureCopyAndPasteClassMessage(
    destinationId: string,
    clippedEntityId: string
  ) {
    this.webSocket.send<RestructureCopyAndPasteClassMessage>(
      RESTRUCTURE_COPY_AND_PASTE_CLASS_EVENT,
      {
        event: RESTRUCTURE_COPY_AND_PASTE_CLASS_EVENT,
        destinationId: destinationId,
        clippedEntityId: clippedEntityId,
      }
    );
  }

  sendRestructureCutAndInsertMessage(
    destinationEntity: string,
    destinationId: string,
    clippedEntity: string,
    clippedEntityId: string
  ) {
    this.webSocket.send<RestructureCutAndInsertMessage>(
      RESTRUCTURE_CUT_AND_INSERT_EVENT,
      {
        event: RESTRUCTURE_CUT_AND_INSERT_EVENT,
        destinationEntity: destinationEntity,
        destinationId: destinationId,
        clippedEntity: clippedEntity,
        clippedEntityId: clippedEntityId,
      }
    );
  }

  sendRestructureCommunicationMessage(
    sourceClassId: string,
    targetClassId: string,
    methodName: string
  ) {
    this.webSocket.send<RestructureCommunicationMessage>(
      RESTRUCTURE_COMMUNICATION_EVENT,
      {
        event: RESTRUCTURE_COMMUNICATION_EVENT,
        sourceClassId: sourceClassId,
        targetClassId: targetClassId,
        methodName: methodName,
      }
    );
  }

  sendRestructureDeleteCommunicationMessage(undo: boolean, commId: string) {
    this.webSocket.send<RestructureDeleteCommunicationMessage>(
      RESTRUCTURE_DELETE_COMMUNICATION_EVENT,
      {
        event: RESTRUCTURE_DELETE_COMMUNICATION_EVENT,
        undo: undo,
        commId: commId,
      }
    );
  }

  sendRestructureRenameOperationMessage(
    commId: string,
    newName: string,
    undo: boolean
  ) {
    this.webSocket.send<RestructureRenameOperationMessage>(
      RESTRUCTURE_RENAME_OPERATION_EVENT,
      {
        event: RESTRUCTURE_RENAME_OPERATION_EVENT,
        commId: commId,
        newName: newName,
        undo: undo,
      }
    );
  }

  sendRestructureRestoreAppMessage(appId: string, undoCutOperation: boolean) {
    this.webSocket.send<RestructureRestoreAppMessage>(
      RESTRUCTURE_RESTORE_APP_EVENT,
      {
        event: RESTRUCTURE_RESTORE_APP_EVENT,
        appId: appId,
        undoCutOperation: undoCutOperation,
      }
    );
  }

  sendRestructureRestorePackageMessage(
    pckgId: string,
    undoCutOperation: boolean
  ) {
    this.webSocket.send<RestructureRestorePackageMessage>(
      RESTRUCTURE_RESTORE_PACKAGE_EVENT,
      {
        event: RESTRUCTURE_RESTORE_PACKAGE_EVENT,
        pckgId: pckgId,
        undoCutOperation: undoCutOperation,
      }
    );
  }

  sendRestructureRestoreClassMessage(
    appId: string,
    clazzId: string,
    undoCutOperation: boolean
  ) {
    this.webSocket.send<RestructureRestoreClassMessage>(
      RESTRUCTURE_RESTORE_CLASS_EVENT,
      {
        event: RESTRUCTURE_RESTORE_CLASS_EVENT,
        appId: appId,
        clazzId: clazzId,
        undoCutOperation: undoCutOperation,
      }
    );
  }

  sendChangeLogRestoreEntriesMessage(key: string) {
    this.webSocket.send<ChangeLogRestoreEntriesMessage>(
      CHANGELOG_RESTORE_ENTRIES_EVENT,
      {
        event: CHANGELOG_RESTORE_ENTRIES_EVENT,
        key: key,
      }
    );
  }

  sendChangeLogRemoveEntryMessage(entryIds: string[]) {
    this.webSocket.send<ChangeLogRemoveEntryMessage>(
      CHANGELOG_REMOVE_ENTRY_EVENT,
      {
        event: CHANGELOG_REMOVE_ENTRY_EVENT,
        entryIds: entryIds,
      }
    );
  }

  /**
   * Informs backend that this user entered or left spectating mode and
   * additionally adds who is spectating who.
   */
  sendSpectatingUpdate(
    isSpectating: boolean,
    spectatedUserId: string,
    spectatingUserIds: string[],
    configurationId = 'default'
  ) {
    this.webSocket.send<SpectatingUpdateMessage>(SPECTATING_UPDATE_EVENT, {
      event: 'spectating_update',
      isSpectating,
      spectatedUserId,
      spectatingUserIds,
      configurationId,
      configuration: { id: configurationId, devices: null },
    });
  }

  /**
   * Informs the backend if a controller was connected/disconnected.
   */
  async sendControllerConnect(controller: VRController | undefined) {
    if (!controller?.connected) return;

    const motionController =
      await controller.controllerModel.motionControllerPromise;
    this.webSocket.send<UserControllerConnectMessage>(
      USER_CONTROLLER_CONNECT_EVENT,
      {
        event: 'user_controller_connect',
        controller: {
          assetUrl: motionController.assetUrl,
          controllerId: controller.gamepadIndex,
          ...getControllerPose(controller),
        },
      }
    );
  }

  async sendJoinVr() {
    this.webSocket.send<JoinVrMessage>('join_vr', {
      event: 'join_vr',
    });
  }

  /**
   * Informs the backend if a controller was connected/disconnected.
   */
  sendControllerDisconnect(controller: VRController) {
    this.webSocket.send<UserControllerDisconnectMessage>(
      USER_CONTROLLER_DISCONNECT_EVENT,
      {
        event: 'user_controller_disconnect',
        controllerId: controller.gamepadIndex,
      }
    );
  }

  /**
   * Informs the backend that an app was opened by this user.
   *
   * @param ApplicationObject3D Opened application
   */
  sendAppOpened(application: ApplicationObject3D) {
    this.webSocket.send<AppOpenedMessage>(APP_OPENED_EVENT, {
      event: 'app_opened',
      id: application.getModelId(),
      position: application.getWorldPosition(new THREE.Vector3()).toArray(),
      quaternion: application
        .getWorldQuaternion(new THREE.Quaternion())
        .toArray(),
      scale: application.scale.toArray(),
    });
  }

  sendPingUpdate(controllerId: ControllerId, isPinging: boolean) {
    this.webSocket.send<PingUpdateMessage>(PING_UPDATE_EVENT, {
      event: 'ping_update',
      controllerId,
      isPinging,
    });
  }

  sendMousePingUpdate(
    modelId: string,
    isApplication: boolean,
    position: THREE.Vector3
  ) {
    this.webSocket.send<MousePingUpdateMessage>(MOUSE_PING_UPDATE_EVENT, {
      event: 'mouse_ping_update',
      modelId,
      isApplication,
      position: position.toArray(),
    });
  }

  sendTimestampUpdate(timestamp: number) {
    this.webSocket.send<TimestampUpdateMessage>(TIMESTAMP_UPDATE_EVENT, {
      event: 'timestamp_update',
      timestamp,
    });
  }
}

declare module '@ember/service' {
  interface Registry {
    'message-sender': MessageSender;
  }
}
