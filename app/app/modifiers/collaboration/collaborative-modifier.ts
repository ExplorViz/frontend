import { assert } from '@ember/debug';
import { registerDestructor } from '@ember/destroyable';
import { inject as service } from '@ember/service';
import CollaborationSession from 'explorviz-frontend/services/collaboration/collaboration-session';
import LocalUser from 'explorviz-frontend/services/collaboration/local-user';
import { ForwardedMessage } from 'react-lib/src/utils/collaboration/web-socket-messages/receivable/forwarded';
import { ALL_HIGHLIGHTS_RESET_EVENT } from 'react-lib/src/utils/collaboration/web-socket-messages/sendable/all-highlights-reset';
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
  RestructureRenameOperationMessage,
  RestructureRestoreAppMessage,
  RestructureRestoreClassMessage,
  RestructureRestorePackageMessage,
  RestructureUpdateMessage,
} from 'react-lib/src/utils/collaboration/web-socket-messages/sendable/restructure-update';
import {
  SHARE_SETTINGS_EVENT,
  ShareSettingsMessage,
} from 'react-lib/src/utils/collaboration/web-socket-messages/sendable/share-settings';
import debugLogger from 'ember-debug-logger';
import Modifier, { ArgsFor } from 'ember-modifier';
import { Position2D } from 'explorviz-frontend/modifiers/interaction-modifier';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';
import Changelog from 'explorviz-frontend/services/changelog';
import HighlightingService from 'explorviz-frontend/services/highlighting-service';
import LandscapeRestructure from 'explorviz-frontend/services/landscape-restructure';
import { useLandscapeTokenStore } from 'react-lib/src/stores/landscape-token';
import LinkRenderer from 'explorviz-frontend/services/link-renderer';
import UserSettings from 'explorviz-frontend/services/user-settings';
import { BaseChangeLogEntry } from 'react-lib/src/utils/changelog-entry';
import { getClassById } from 'react-lib/src/utils/class-helpers';
import ClassCommunication from 'react-lib/src/utils/landscape-schemes/dynamic/class-communication';
import {
  Application,
  Class,
  Package,
  StructureLandscapeData,
} from 'react-lib/src/utils/landscape-schemes/structure-data';
import { getApplicationInLandscapeById } from 'react-lib/src/utils/landscape-structure-helpers';
import { getPackageById } from 'react-lib/src/utils/package-helpers';
import { VisualizationSettings } from 'react-lib/src/utils/settings/settings-schemas';
import ClazzCommunicationMesh from 'react-lib/src/view-objects/3d/application/clazz-communication-mesh';
import ComponentMesh from 'react-lib/src/view-objects/3d/application/component-mesh';
import WaypointIndicator from 'react-lib/src/utils/extended-reality/view-objects/vr/waypoint-indicator';
import * as THREE from 'three';
import { Vector3 } from 'three';
import { useApplicationRepositoryStore } from 'react-lib/src/stores/repos/application-repository';
import { useToastHandlerStore } from 'react-lib/src/stores/toast-handler';
import { event } from 'jquery';
import eventEmitter from 'react-lib/src/utils/event-emitter';

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

  debug = debugLogger('CollaborativeModifier');

  @service('application-renderer')
  private applicationRenderer!: ApplicationRenderer;

  // @service('repos/application-repository')
  // private applicationRepo!: ApplicationRepository;

  @service('changelog')
  private changeLog!: Changelog;

  @service('collaboration/collaboration-session')
  private collaborationSession!: CollaborationSession;

  @service('highlighting-service')
  private highlightingService!: HighlightingService;

  @service('landscape-restructure')
  private landscapeRestructure!: LandscapeRestructure;

  @service('link-renderer')
  private linkRenderer!: LinkRenderer;

  @service('collaboration/local-user')
  private localUser!: LocalUser;

  @service('user-settings')
  private userSettings!: UserSettings;

  get canvas(): HTMLCanvasElement {
    assert(
      `Element must be 'HTMLCanvasElement' but was ${typeof this.element}`,
      this.element instanceof HTMLCanvasElement
    );
    return this.element as HTMLCanvasElement;
  }

  get raycastObject3D(): THREE.Object3D {
    return this.args.named.raycastObject3D;
  }

  get camera(): THREE.Camera {
    return this.args.named.camera;
  }

  constructor(owner: any, args: ArgsFor<IModifierArgs>) {
    super(owner, args);
    this.args = args as IModifierArgs;
    eventEmitter.on(MOUSE_PING_UPDATE_EVENT, this.onMousePingUpdate);
    eventEmitter.on(COMPONENT_UPDATE_EVENT, this.onComponentUpdate);
    eventEmitter.on(
      ALL_HIGHLIGHTS_RESET_EVENT,
      this.onAllHighlightsReset
    );
    eventEmitter.on(
      HIGHLIGHTING_UPDATE_EVENT,
      this.onHighlightingUpdate
    );
    eventEmitter.on(CHANGE_LANDSCAPE_EVENT, this.onChangeLandscape);
    eventEmitter.on(SHARE_SETTINGS_EVENT,  this.onShareSettings);
    eventEmitter.on(
      RESTRUCTURE_MODE_UPDATE_EVENT,
      this.onRestructureModeUpdate
    );
    eventEmitter.on(RESTRUCTURE_UPDATE_EVENT, this.onRestructureUpdate);
    eventEmitter.on(
      RESTRUCTURE_CREATE_OR_DELETE_EVENT,
      this.onRestructureCreateOrDelete
    );
    eventEmitter.on(
      RESTRUCTURE_COPY_AND_PASTE_PACKAGE_EVENT,
      this.onRestructureCopyAndPastePackage
    );
    eventEmitter.on(
      RESTRUCTURE_COPY_AND_PASTE_CLASS_EVENT,
      this.onRestructureCopyAndPasteClass
    );
    eventEmitter.on(
      RESTRUCTURE_CUT_AND_INSERT_EVENT,
      this.onRestructureCutAndInsert
    );
    eventEmitter.on(
      RESTRUCTURE_COMMUNICATION_EVENT,
      this.onRestructureCommunication
    );
    eventEmitter.on(
      RESTRUCTURE_DELETE_COMMUNICATION_EVENT,
      this.onRestructureDeleteCommunication
    );
    eventEmitter.on(
      RESTRUCTURE_RENAME_OPERATION_EVENT,
      this.onRestructureRenameOperationMessage
    );
    eventEmitter.on(
      RESTRUCTURE_RESTORE_APP_EVENT,
      this.onRestructureRestoreApp
    );
    eventEmitter.on(
      RESTRUCTURE_RESTORE_PACKAGE_EVENT,
      this.onRestructureRestorePackage
    );
    eventEmitter.on(
      RESTRUCTURE_RESTORE_CLASS_EVENT,
      this.onRestructureRestoreClass
    );
    eventEmitter.on(
      CHANGELOG_REMOVE_ENTRY_EVENT,
      this.onChangeLogRemoveEntry
    );
    eventEmitter.on(
      CHANGELOG_RESTORE_ENTRIES_EVENT,
      this.onChangeLogRestoreEntriesMessage
    );
    eventEmitter.on(
      RESTRUCTURE_DUPLICATE_APP,
      this.onRestructureDuplicateApp
    );

    registerDestructor(this, this.cleanup);
  }

  cleanup = () => {
    this.removeEventListener();
  };

  removeEventListener() {
    eventEmitter.off(MOUSE_PING_UPDATE_EVENT, this.onMousePingUpdate);
    eventEmitter.off(COMPONENT_UPDATE_EVENT,  this.onComponentUpdate);
    eventEmitter.off(
      HIGHLIGHTING_UPDATE_EVENT,
      this.onHighlightingUpdate
    );
    eventEmitter.off(CHANGE_LANDSCAPE_EVENT, this.onChangeLandscape);
    eventEmitter.off(
      RESTRUCTURE_MODE_UPDATE_EVENT,
      this.onRestructureModeUpdate
    );
    eventEmitter.off(
      RESTRUCTURE_UPDATE_EVENT,
      this.onRestructureUpdate
    );
    eventEmitter.off(
      RESTRUCTURE_CREATE_OR_DELETE_EVENT,
      this.onRestructureCreateOrDelete
    );
    eventEmitter.off(
      RESTRUCTURE_COPY_AND_PASTE_PACKAGE_EVENT,
      this.onRestructureCopyAndPastePackage
    );
    eventEmitter.off(
      RESTRUCTURE_COPY_AND_PASTE_CLASS_EVENT,
      this.onRestructureCopyAndPasteClass
    );
    eventEmitter.off(
      RESTRUCTURE_CUT_AND_INSERT_EVENT,
      this.onRestructureCutAndInsert
    );
    eventEmitter.off(
      RESTRUCTURE_COMMUNICATION_EVENT,
      this.onRestructureCommunication
    );
    eventEmitter.off(
      RESTRUCTURE_DELETE_COMMUNICATION_EVENT,
      this.onRestructureDeleteCommunication
    );
    eventEmitter.off(
      RESTRUCTURE_RENAME_OPERATION_EVENT,
      this.onRestructureRenameOperationMessage
    );
    eventEmitter.off(
      RESTRUCTURE_RESTORE_APP_EVENT,
      this.onRestructureRestoreApp
    );
    eventEmitter.off(
      RESTRUCTURE_RESTORE_PACKAGE_EVENT,
      this.onRestructureRestorePackage
    );
    eventEmitter.off(
      RESTRUCTURE_RESTORE_CLASS_EVENT,
      this.onRestructureRestoreClass
    );
    eventEmitter.off(
      CHANGELOG_REMOVE_ENTRY_EVENT,
      this.onChangeLogRemoveEntry
    );
    eventEmitter.off(
      CHANGELOG_RESTORE_ENTRIES_EVENT,
      this.onChangeLogRestoreEntriesMessage
    );
    eventEmitter.off(
      RESTRUCTURE_DUPLICATE_APP,
      this.onRestructureDuplicateApp
    );
  }

  onComponentUpdate({
    originalMessage: { isFoundation, appId, isOpened, componentId },
  }: ForwardedMessage<ComponentUpdateMessage>): void {
    const applicationObject3D =
      this.applicationRenderer.getApplicationById(appId);
    if (!applicationObject3D) return;

    const componentMesh = applicationObject3D.getBoxMeshByModelId(componentId);

    if (isFoundation) {
      if (isOpened) {
        this.applicationRenderer.openAllComponentsLocally(applicationObject3D);
      } else {
        this.applicationRenderer.closeAllComponentsLocally(applicationObject3D);
      }
    } else if (
      componentMesh instanceof ComponentMesh &&
      componentMesh.opened !== isOpened
    ) {
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
    originalMessage: { appId, entityId, isHighlighted },
  }: ForwardedMessage<HighlightingUpdateMessage>): void {
    const user = this.collaborationSession.lookupRemoteUserById(userId);
    if (!user) return;
    const application = this.applicationRenderer.getApplicationById(appId);
    if (!application) {
      // extern communication link
      const mesh = this.applicationRenderer.getMeshById(entityId);
      if (mesh instanceof ClazzCommunicationMesh) {
        // multi selected extern links?
        this.highlightingService.toggleHighlight(mesh, {
          sendMessage: false,
          remoteColor: user.color,
        });
      }
      return;
    }

    const mesh: any = application.getMeshById(entityId);
    if (mesh?.highlighted !== isHighlighted) {
      this.highlightingService.toggleHighlight(mesh, {
        sendMessage: false,
        remoteColor: user.color,
      });
    }
  }

  onChangeLandscape({
    // userId,
    originalMessage: { landscapeToken },
  }: ForwardedMessage<ChangeLandscapeMessage>): void {
    if (useLandscapeTokenStore.getState().token?.value === landscapeToken) {
      return;
    }
    useLandscapeTokenStore.getState().setTokenByValue(landscapeToken);

    this.applicationRenderer.cleanup();
    useApplicationRepositoryStore.getState().clearApplication();
    // this.applicationRepo.cleanup();
    this.linkRenderer.getAllLinks().forEach((externLink) => {
      externLink.removeFromParent();
    });
  }

  onShareSettings({
    userId,
    originalMessage: { settings },
  }: ForwardedMessage<ShareSettingsMessage>): void {
    this.userSettings.updateSettings(settings as VisualizationSettings);

    const remoteUser = this.collaborationSession.lookupRemoteUserById(userId);
    useToastHandlerStore
      .getState()
      .showInfoToastMessage(
        'Applied settings from user ' + remoteUser?.userName
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
        durationInMs: 5000,
        replay: false,
      });
    }

    const waypointIndicator = new WaypointIndicator({
      target: remoteUser.mousePing.mesh,
      color: remoteUser.color,
    });
    this.localUser.defaultCamera.add(waypointIndicator);
  }
}
