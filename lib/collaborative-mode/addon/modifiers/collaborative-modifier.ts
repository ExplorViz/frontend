import { assert } from '@ember/debug';
import { registerDestructor } from '@ember/destroyable';
import { inject as service } from '@ember/service';
import CollaborationSession from 'collaborative-mode/services/collaboration-session';
import LocalUser from 'collaborative-mode/services/local-user';
import debugLogger from 'ember-debug-logger';
import Modifier, { ArgsFor } from 'ember-modifier';
import { Position2D } from 'explorviz-frontend/modifiers/interaction-modifier';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';
import Changelog from 'explorviz-frontend/services/changelog';
import HighlightingService from 'explorviz-frontend/services/highlighting-service';
import LandscapeRestructure from 'explorviz-frontend/services/landscape-restructure';
import { BaseChangeLogEntry } from 'explorviz-frontend/utils/changelog-entry';
import { getClassById } from 'explorviz-frontend/utils/class-helpers';
import ClassCommunication from 'explorviz-frontend/utils/landscape-schemes/dynamic/class-communication';
import {
  Application,
  Class,
  Package,
  StructureLandscapeData,
} from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import { getApplicationInLandscapeById } from 'explorviz-frontend/utils/landscape-structure-helpers';
import { getPackageById } from 'explorviz-frontend/utils/package-helpers';
import ClazzCommunicationMesh from 'explorviz-frontend/view-objects/3d/application/clazz-communication-mesh';
import ComponentMesh from 'explorviz-frontend/view-objects/3d/application/component-mesh';
import * as THREE from 'three';
import { Vector3 } from 'three';
import WebSocketService from 'virtual-reality/services/web-socket';
import WaypointIndicator from 'virtual-reality/utils/view-objects/vr/waypoint-indicator';
import { ForwardedMessage } from 'virtual-reality/utils/vr-message/receivable/forwarded';
import { ALL_HIGHLIGHTS_RESET_EVENT } from 'virtual-reality/utils/vr-message/sendable/all_highlights_reset';
import {
  AppOpenedMessage,
  APP_OPENED_EVENT,
} from 'virtual-reality/utils/vr-message/sendable/app_opened';
import {
  CHANGELOG_REMOVE_ENTRY_EVENT,
  CHANGELOG_RESTORE_ENTRIES_EVENT,
  ChangeLogRemoveEntryMessage,
  ChangeLogRestoreEntriesMessage,
} from 'virtual-reality/utils/vr-message/sendable/changelog_update';
import {
  ComponentUpdateMessage,
  COMPONENT_UPDATE_EVENT,
} from 'virtual-reality/utils/vr-message/sendable/component_update';
import {
  HighlightingUpdateMessage,
  HIGHLIGHTING_UPDATE_EVENT,
} from 'virtual-reality/utils/vr-message/sendable/highlighting_update';
import {
  MousePingUpdateMessage,
  MOUSE_PING_UPDATE_EVENT,
} from 'virtual-reality/utils/vr-message/sendable/mouse-ping-update';
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
  RestructureRenameOperationMessage,
  RestructureRestoreAppMessage,
  RestructureRestoreClassMessage,
  RestructureRestorePackageMessage,
  RestructureUpdateMessage,
} from 'virtual-reality/utils/vr-message/sendable/restructure_update';

interface IModifierArgs {
  positional: [];
  named: {
    camera: THREE.Camera;
    raycastObject3D: THREE.Object3D;
    mouseMove?(mesh?: THREE.Object3D): void;
    mouseStop?(mesh?: THREE.Object3D, mousePosition?: Position2D): void;
    mouseOut?(): void;
    onSingleClick?(mesh?: THREE.Object3D): void;
    onDoubleClick?(mesh?: THREE.Object3D): void;
    setPerspective?(position: number[], rotation: number[]): void;
    repositionSphere?(vector: Vector3, user: string, color: string): void;
  };
}

export default class CollaborativeModifierModifier extends Modifier<IModifierArgs> {
  args: IModifierArgs;
  element: unknown;

  constructor(owner: any, args: ArgsFor<IModifierArgs>) {
    super(owner, args);
    this.args = args as IModifierArgs;
    this.webSocket.on(APP_OPENED_EVENT, this, this.onAppOpened);
    this.webSocket.on(MOUSE_PING_UPDATE_EVENT, this, this.onMousePingUpdate);
    this.webSocket.on(COMPONENT_UPDATE_EVENT, this, this.onComponentUpdate);
    this.webSocket.on(
      ALL_HIGHLIGHTS_RESET_EVENT,
      this,
      this.onAllHighlightsReset
    );
    this.webSocket.on(
      HIGHLIGHTING_UPDATE_EVENT,
      this,
      this.onHighlightingUpdate
    );
    this.webSocket.on(
      RESTRUCTURE_MODE_UPDATE_EVENT,
      this,
      this.onRestructureModeUpdate
    );
    this.webSocket.on(RESTRUCTURE_UPDATE_EVENT, this, this.onRestructureUpdate);
    this.webSocket.on(
      RESTRUCTURE_CREATE_OR_DELETE_EVENT,
      this,
      this.onRestructureCreateOrDelete
    );
    this.webSocket.on(
      RESTRUCTURE_COPY_AND_PASTE_PACKAGE_EVENT,
      this,
      this.onRestructureCopyAndPastePackage
    );
    this.webSocket.on(
      RESTRUCTURE_COPY_AND_PASTE_CLASS_EVENT,
      this,
      this.onRestructureCopyAndPasteClass
    );
    this.webSocket.on(
      RESTRUCTURE_CUT_AND_INSERT_EVENT,
      this,
      this.onRestructureCutAndInsert
    );
    this.webSocket.on(
      RESTRUCTURE_COMMUNICATION_EVENT,
      this,
      this.onRestructureCommunication
    );
    this.webSocket.on(
      RESTRUCTURE_DELETE_COMMUNICATION_EVENT,
      this,
      this.onRestructureDeleteCommunication
    );
    this.webSocket.on(
      RESTRUCTURE_RENAME_OPERATION_EVENT,
      this,
      this.onRestructureRenameOperationMessage
    );
    this.webSocket.on(
      RESTRUCTURE_RESTORE_APP_EVENT,
      this,
      this.onRestructureRestoreApp
    );
    this.webSocket.on(
      RESTRUCTURE_RESTORE_PACKAGE_EVENT,
      this,
      this.onRestructureRestorePackage
    );
    this.webSocket.on(
      RESTRUCTURE_RESTORE_CLASS_EVENT,
      this,
      this.onRestructureRestoreClass
    );
    this.webSocket.on(
      CHANGELOG_REMOVE_ENTRY_EVENT,
      this,
      this.onChangeLogRemoveEntry
    );
    this.webSocket.on(
      CHANGELOG_RESTORE_ENTRIES_EVENT,
      this,
      this.onChangeLogRestoreEntriesMessage
    );
    this.webSocket.on(
      RESTRUCTURE_DUPLICATE_APP,
      this,
      this.onRestructureDuplicateApp
    );

    registerDestructor(this, this.cleanup);
  }

  cleanup = () => {
    this.removeEventListener();
  };

  removeEventListener() {
    this.webSocket.off(MOUSE_PING_UPDATE_EVENT, this, this.onMousePingUpdate);
    this.webSocket.off(APP_OPENED_EVENT, this, this.onAppOpened);
    this.webSocket.off(COMPONENT_UPDATE_EVENT, this, this.onComponentUpdate);
    this.webSocket.off(
      HIGHLIGHTING_UPDATE_EVENT,
      this,
      this.onHighlightingUpdate
    );
    this.webSocket.off(
      RESTRUCTURE_MODE_UPDATE_EVENT,
      this,
      this.onRestructureModeUpdate
    );
    this.webSocket.off(
      RESTRUCTURE_UPDATE_EVENT,
      this,
      this.onRestructureUpdate
    );
    this.webSocket.off(
      RESTRUCTURE_CREATE_OR_DELETE_EVENT,
      this,
      this.onRestructureCreateOrDelete
    );
    this.webSocket.off(
      RESTRUCTURE_COPY_AND_PASTE_PACKAGE_EVENT,
      this,
      this.onRestructureCopyAndPastePackage
    );
    this.webSocket.off(
      RESTRUCTURE_COPY_AND_PASTE_CLASS_EVENT,
      this,
      this.onRestructureCopyAndPasteClass
    );
    this.webSocket.off(
      RESTRUCTURE_CUT_AND_INSERT_EVENT,
      this,
      this.onRestructureCutAndInsert
    );
    this.webSocket.off(
      RESTRUCTURE_COMMUNICATION_EVENT,
      this,
      this.onRestructureCommunication
    );
    this.webSocket.off(
      RESTRUCTURE_DELETE_COMMUNICATION_EVENT,
      this,
      this.onRestructureDeleteCommunication
    );
    this.webSocket.off(
      RESTRUCTURE_RENAME_OPERATION_EVENT,
      this,
      this.onRestructureRenameOperationMessage
    );
    this.webSocket.off(
      RESTRUCTURE_RESTORE_APP_EVENT,
      this,
      this.onRestructureRestoreApp
    );
    this.webSocket.off(
      RESTRUCTURE_RESTORE_PACKAGE_EVENT,
      this,
      this.onRestructureRestorePackage
    );
    this.webSocket.off(
      RESTRUCTURE_RESTORE_CLASS_EVENT,
      this,
      this.onRestructureRestoreClass
    );
    this.webSocket.off(
      CHANGELOG_REMOVE_ENTRY_EVENT,
      this,
      this.onChangeLogRemoveEntry
    );
    this.webSocket.off(
      CHANGELOG_RESTORE_ENTRIES_EVENT,
      this,
      this.onChangeLogRestoreEntriesMessage
    );
    this.webSocket.off(
      RESTRUCTURE_DUPLICATE_APP,
      this,
      this.onRestructureDuplicateApp
    );
  }

  debug = debugLogger('CollaborativeModifier');

  @service('web-socket')
  private webSocket!: WebSocketService;

  @service('collaboration-session')
  private collaborationSession!: CollaborationSession;

  @service('application-renderer')
  private applicationRenderer!: ApplicationRenderer;

  @service('highlighting-service')
  private highlightingService!: HighlightingService;

  @service('landscape-restructure')
  landscapeRestructure!: LandscapeRestructure;

  @service('changelog')
  changeLog!: Changelog;

  @service('local-user')
  private localUser!: LocalUser;

  get canvas(): HTMLCanvasElement {
    assert(
      `Element must be 'HTMLCanvasElement' but was ${typeof this.element}`,
      this.element instanceof HTMLCanvasElement
    );
    return this.element;
  }

  get raycastObject3D(): THREE.Object3D {
    return this.args.named.raycastObject3D;
  }

  get camera(): THREE.Camera {
    return this.args.named.camera;
  }

  async onAppOpened({
    originalMessage: { id, position, quaternion, scale },
  }: ForwardedMessage<AppOpenedMessage>): Promise<void> {
    this.applicationRenderer.openApplicationTask.perform(
      id,
      {
        position: new THREE.Vector3(...position),
        quaternion: new THREE.Quaternion(...quaternion),
        scale: new THREE.Vector3(...scale),
      },
      false
    );
  }

  onComponentUpdate({
    originalMessage: { isFoundation, appId, isOpened, componentId },
  }: ForwardedMessage<ComponentUpdateMessage>): void {
    const applicationObject3D =
      this.applicationRenderer.getApplicationById(appId);
    if (!applicationObject3D) return;

    const componentMesh = applicationObject3D.getBoxMeshbyModelId(componentId);

    if (isFoundation) {
      if (isOpened) {
        this.applicationRenderer.openAllComponentsLocally(applicationObject3D);
      } else {
        this.applicationRenderer.closeAllComponentsLocally(applicationObject3D);
      }
    } else if (componentMesh instanceof ComponentMesh) {
      this.applicationRenderer.toggleComponentLocally(
        componentMesh,
        applicationObject3D
      );
    }
  }

  onAllHighlightsReset(): void {
    this.highlightingService.removeHighlightingForAllApplications(false);
    this.highlightingService.updateHighlighting();
  }

  onHighlightingUpdate({
    userId,
    originalMessage: { appId, entityId /*, multiSelected */ },
  }: ForwardedMessage<HighlightingUpdateMessage>): void {
    const user = this.collaborationSession.lookupRemoteUserById(userId);
    if (!user) return;
    const application = this.applicationRenderer.getApplicationById(appId);
    if (!application) {
      // extern communication link
      const mesh = this.applicationRenderer.getMeshById(entityId);
      if (mesh instanceof ClazzCommunicationMesh) {
        // multi selected extern links?
        this.applicationRenderer.highlightExternLink(mesh, false, user.color);
      }
      return;
    }

    const mesh = application.getMeshById(entityId);
    this.applicationRenderer.highlight(
      mesh,
      application,
      user.color,
      false // whenever we receive messages we don't want to resend them
    );
  }

  onRestructureModeUpdate(): void {
    this.landscapeRestructure.toggleRestructureModeLocally();
  }

  onRestructureUpdate({
    originalMessage: { entityType, entityId, newName, appId, undo },
  }: ForwardedMessage<RestructureUpdateMessage>): void {
    switch (entityType) {
      case 'APP':
        this.landscapeRestructure.renameApplication(
          newName,
          entityId,
          true,
          undo
        );
        break;
      case 'PACKAGE':
        this.landscapeRestructure.renamePackage(newName, entityId, true, undo);
        break;
      case 'SUBPACKAGE':
        this.landscapeRestructure.renameSubPackage(
          newName,
          entityId,
          true,
          undo
        );
        break;
      case 'CLAZZ':
        this.landscapeRestructure.renameClass(
          newName,
          entityId,
          appId as string,
          true,
          undo
        );
    }
  }

  onRestructureCreateOrDelete({
    originalMessage: { action, entityType, name, language, entityId, undo },
  }: ForwardedMessage<RestructureCreateOrDeleteMessage>): void {
    if (action === 'CREATE') {
      switch (entityType) {
        case 'APP':
          this.landscapeRestructure.addApplication(
            name as string,
            language as string,
            true
          );
          break;
        case 'PACKAGE':
          this.landscapeRestructure.addCollaborativePackage(entityId as string);
          break;
        case 'SUBPACKAGE':
          this.landscapeRestructure.addCollaborativeSubPackage(
            entityId as string
          );
          break;
        case 'CLAZZ':
          this.landscapeRestructure.addCollaborativeClass(entityId as string);
          break;
      }
    } else {
      switch (entityType) {
        case 'APP':
          this.landscapeRestructure.deleteCollaborativeApplication(
            entityId as string,
            undo as boolean
          );
          break;
        case 'PACKAGE':
          this.landscapeRestructure.deleteCollaborativePackage(
            entityId as string,
            undo as boolean
          );
          break;
        case 'CLAZZ':
          this.landscapeRestructure.deleteCollaborativeClass(
            entityId as string,
            undo as boolean
          );
          break;
      }
    }
  }

  onRestructureDuplicateApp({
    originalMessage: { appId },
  }: ForwardedMessage<RestructureDuplicateAppMessage>): void {
    const app = getApplicationInLandscapeById(
      this.landscapeRestructure.landscapeData
        ?.structureLandscapeData as StructureLandscapeData,
      appId
    );
    this.landscapeRestructure.duplicateApp(app as Application, true);
  }

  onRestructureCopyAndPastePackage({
    originalMessage: { destinationEntity, destinationId, clippedEntityId },
  }: ForwardedMessage<RestructureCopyAndPastePackageMessage>): void {
    this.landscapeRestructure.pasteCollaborativePackage(
      destinationEntity,
      destinationId,
      clippedEntityId
    );
  }

  onRestructureCopyAndPasteClass({
    originalMessage: { destinationId, clippedEntityId },
  }: ForwardedMessage<RestructureCopyAndPasteClassMessage>): void {
    this.landscapeRestructure.pasteCollaborativeClass(
      destinationId,
      clippedEntityId
    );
  }

  onRestructureCutAndInsert({
    originalMessage: {
      destinationEntity,
      destinationId,
      clippedEntity,
      clippedEntityId,
    },
  }: ForwardedMessage<RestructureCutAndInsertMessage>): void {
    this.landscapeRestructure.insertCollaborativePackagerOrClass(
      destinationEntity,
      destinationId,
      clippedEntity,
      clippedEntityId
    );
  }

  onRestructureCommunication({
    originalMessage: { sourceClassId, targetClassId, methodName },
  }: ForwardedMessage<RestructureCommunicationMessage>): void {
    this.landscapeRestructure.addCollaborativeCommunication(
      sourceClassId,
      targetClassId,
      methodName
    );
  }

  onRestructureDeleteCommunication({
    originalMessage: { undo, commId },
  }: ForwardedMessage<RestructureDeleteCommunicationMessage>): void {
    const comm = this.landscapeRestructure.allClassCommunications.find(
      (comm) => comm.id === commId
    );
    this.landscapeRestructure.deleteCommunication(
      comm as ClassCommunication,
      undo,
      true
    );
  }

  onRestructureRenameOperationMessage({
    originalMessage: { commId, newName, undo },
  }: ForwardedMessage<RestructureRenameOperationMessage>): void {
    const comm = this.landscapeRestructure.allClassCommunications.find(
      (comm) => comm.id === commId
    );

    this.landscapeRestructure.renameOperation(
      comm as ClassCommunication,
      newName,
      true,
      undo
    );
  }

  onRestructureRestoreApp({
    originalMessage: { appId, undoCutOperation },
  }: ForwardedMessage<RestructureRestoreAppMessage>): void {
    const landscapeData =
      this.landscapeRestructure.landscapeData?.structureLandscapeData;
    const app = getApplicationInLandscapeById(
      landscapeData as StructureLandscapeData,
      appId
    );
    this.landscapeRestructure.restoreApplication(
      app as Application,
      undoCutOperation,
      true
    );
  }
  onRestructureRestorePackage({
    originalMessage: { pckgId, undoCutOperation },
  }: ForwardedMessage<RestructureRestorePackageMessage>): void {
    const landscapeData =
      this.landscapeRestructure.landscapeData?.structureLandscapeData;
    const pckg = getPackageById(
      landscapeData as StructureLandscapeData,
      pckgId
    );
    this.landscapeRestructure.restorePackage(
      pckg as Package,
      undoCutOperation,
      true
    );
  }

  onRestructureRestoreClass({
    originalMessage: { appId, clazzId, undoCutOperation },
  }: ForwardedMessage<RestructureRestoreClassMessage>): void {
    const landscapeData =
      this.landscapeRestructure.landscapeData?.structureLandscapeData;
    const app = getApplicationInLandscapeById(
      landscapeData as StructureLandscapeData,
      appId
    );
    const clazz = getClassById(
      landscapeData as StructureLandscapeData,
      clazzId
    );
    this.landscapeRestructure.restoreClass(
      app as Application,
      clazz as Class,
      undoCutOperation,
      true
    );
  }

  onChangeLogRemoveEntry({
    originalMessage: { entryIds },
  }: ForwardedMessage<ChangeLogRemoveEntryMessage>): void {
    if (entryIds.length > 1) {
      const entries: BaseChangeLogEntry[] = [];
      entryIds.forEach((id) => {
        const foundEntry = this.changeLog.changeLogEntries.find(
          (entry) => entry.id === id
        );
        entries.push(foundEntry as BaseChangeLogEntry);
      });

      this.changeLog.removeEntries(entries, true);
    } else {
      const foundEntry = this.changeLog.changeLogEntries.find(
        (entry) => entry.id === entryIds[0]
      );

      this.changeLog.removeEntry(foundEntry as BaseChangeLogEntry, true);
    }
  }

  onChangeLogRestoreEntriesMessage({
    originalMessage: { key },
  }: ForwardedMessage<ChangeLogRestoreEntriesMessage>): void {
    this.changeLog.restoreDeletedEntries(key, true);
  }

  onMousePingUpdate({
    userId,
    originalMessage: { modelId, position },
  }: ForwardedMessage<MousePingUpdateMessage>): void {
    const remoteUser = this.collaborationSession.lookupRemoteUserById(userId);
    if (!remoteUser) return;

    const applicationObj = this.applicationRenderer.getApplicationById(modelId);

    const point = new THREE.Vector3().fromArray(position);
    if (applicationObj) {
      remoteUser.mousePing.ping.perform({
        parentObj: applicationObj,
        position: point,
      });
    }

    const waypointIndicator = new WaypointIndicator({
      target: remoteUser.mousePing.mesh,
      color: remoteUser.color,
    });
    this.localUser.defaultCamera.add(waypointIndicator);
  }
}
