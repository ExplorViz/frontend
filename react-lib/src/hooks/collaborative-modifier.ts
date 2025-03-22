import React, { useEffect } from 'react';

import { useCollaborationSessionStore } from 'react-lib/src/stores/collaboration/collaboration-session';
import { useLocalUserStore } from 'react-lib/src/stores/collaboration/local-user';
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
import { useApplicationRendererStore } from 'react-lib/src/stores/application-renderer';
import { useChangelogStore } from 'react-lib/src/stores/changelog';
import { useHighlightingStore } from 'react-lib/src/stores/highlighting';
import { useLandscapeRestructureStore } from 'react-lib/src/stores/landscape-restructure';
import { useLandscapeTokenStore } from 'react-lib/src/stores/landscape-token';
import { useLinkRendererStore } from 'react-lib/src/stores/link-renderer';
import { useUserSettingsStore } from 'react-lib/src/stores/user-settings';
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
import { useApplicationRepositoryStore } from 'react-lib/src/stores/repos/application-repository';
import { useToastHandlerStore } from 'react-lib/src/stores/toast-handler';
import eventEmitter from 'react-lib/src/utils/event-emitter';
import { useShallow } from 'zustand/react/shallow';

export default function useCollaborativeModifier() {
  // MARK: Stores

  const collaborationSessionActions = useCollaborationSessionStore(
    useShallow((state) => ({
      lookupRemoteUserById: state.lookupRemoteUserById,
    }))
  );

  const applicationRendererActions = useApplicationRendererStore(
    useShallow((state) => ({
      getApplicationById: state.getApplicationById,
      getMeshById: state.getMeshById,
      toggleComponentLocally: state.toggleComponentLocally,
      openAllComponentsLocally: state.openAllComponentsLocally,
      closeAllComponentsLocally: state.closeAllComponentsLocally,
      cleanup: state.cleanup,
    }))
  );

  const applicationRepositoryActions = useApplicationRepositoryStore(
    useShallow((state) => ({
      cleanup: state.cleanup,
    }))
  );

  const highlightingActions = useHighlightingStore(
    useShallow((state) => ({
      removeHighlightingForAllApplications:
        state.removeHighlightingForAllApplications,
      updateHighlighting: state.updateHighlighting,
      toggleHighlight: state.toggleHighlight,
    }))
  );

  const linkRendererActions = useLinkRendererStore(
    useShallow((state) => ({
      getAllLinks: state.getAllLinks,
    }))
  );

  const landscapeTokenState = useLandscapeTokenStore(
    useShallow((state) => ({
      token: state.token,
    }))
  );
  const landscapeTokenActions = useLandscapeTokenStore(
    useShallow((state) => ({
      setTokenByValue: state.setTokenByValue,
    }))
  );

  const userSettingsActions = useUserSettingsStore(
    useShallow((state) => ({
      updateSettings: state.updateSettings,
    }))
  );

  const landscapeRestructureState = useLandscapeRestructureStore(
    useShallow((state) => ({
      landscapeData: state.landscapeData,
      allClassCommunications: state.allClassCommunications,
    }))
  );
  const landscapeRestructureActions = useLandscapeRestructureStore(
    useShallow((state) => ({
      toggleRestructureModeLocally: state.toggleRestructureModeLocally,
      renameApplication: state.renameApplication,
      renamePackage: state.renamePackage,
      renameSubPackage: state.renameSubPackage,
      renameClass: state.renameClass,
      addApplication: state.addApplication,
      addCollaborativePackage: state.addCollaborativePackage,
      addCollaborativeSubPackage: state.addCollaborativeSubPackage,
      addCollaborativeClass: state.addCollaborativeClass,
      deleteCollaborativeApplication: state.deleteCollaborativeApplication,
      deleteCollaborativePackage: state.deleteCollaborativePackage,
      deleteCollaborativeClass: state.deleteCollaborativeClass,
      duplicateApp: state.duplicateApp,
      pasteCollaborativePackage: state.pasteCollaborativePackage,
      pasteCollaborativeClass: state.pasteCollaborativeClass,
      insertCollaborativePackagerOrClass:
        state.insertCollaborativePackagerOrClass,
      addCollaborativeCommunication: state.addCollaborativeCommunication,
      deleteCommunication: state.deleteCommunication,
      renameOperation: state.renameOperation,
      restoreApplication: state.restoreApplication,
      restorePackage: state.restorePackage,
      restoreClass: state.restoreClass,
    }))
  );

  const changeLogState = useChangelogStore(
    useShallow((state) => ({
      changeLogEntries: state.changeLogEntries,
    }))
  );
  const changeLogActions = useChangelogStore(
    useShallow((state) => ({
      removeEntry: state.removeEntry,
      removeEntries: state.removeEntries,
      restoreDeletedEntries: state.restoreDeletedEntries,
    }))
  );

  const localUserState = useLocalUserStore(
    useShallow((state) => ({
      defaultCamera: state.defaultCamera,
    }))
  );

  const showInfoToastMessage = useToastHandlerStore(
    (state) => state.showInfoToastMessage
  );

  // MARK: Event handlers

  const onComponentUpdate = ({
    originalMessage: { isFoundation, appId, isOpened, componentId },
  }: ForwardedMessage<ComponentUpdateMessage>): void => {
    const applicationObject3D =
      applicationRendererActions.getApplicationById(appId);
    if (!applicationObject3D) return;

    const componentMesh = applicationObject3D.getBoxMeshByModelId(componentId);

    if (isFoundation) {
      if (isOpened) {
        applicationRendererActions.openAllComponentsLocally(
          applicationObject3D
        );
      } else {
        applicationRendererActions.closeAllComponentsLocally(
          applicationObject3D
        );
      }
    } else if (
      componentMesh instanceof ComponentMesh &&
      componentMesh.opened !== isOpened
    ) {
      applicationRendererActions.toggleComponentLocally(
        componentMesh,
        applicationObject3D
      );
    }
  };

  const onAllHighlightsReset = (): void => {
    highlightingActions.removeHighlightingForAllApplications(false);
    highlightingActions.updateHighlighting();
  };

  const onHighlightingUpdate = ({
    userId,
    originalMessage: { appId, entityId, isHighlighted },
  }: ForwardedMessage<HighlightingUpdateMessage>): void => {
    const user = collaborationSessionActions.lookupRemoteUserById(userId);
    if (!user) return;
    const application = applicationRendererActions.getApplicationById(appId);
    if (!application) {
      // extern communication link
      const mesh = applicationRendererActions.getMeshById(entityId);
      if (mesh instanceof ClazzCommunicationMesh) {
        // multi selected extern links?
        highlightingActions.toggleHighlight(mesh, {
          sendMessage: false,
          remoteColor: user.color,
        });
      }
      return;
    }

    const mesh: any = application.getMeshById(entityId);
    if (mesh?.highlighted !== isHighlighted) {
      highlightingActions.toggleHighlight(mesh, {
        sendMessage: false,
        remoteColor: user.color,
      });
    }
  };

  const onChangeLandscape = ({
    // userId,
    originalMessage: { landscapeToken },
  }: ForwardedMessage<ChangeLandscapeMessage>): void => {
    if (landscapeTokenState.token?.value === landscapeToken) {
      return;
    }
    landscapeTokenActions.setTokenByValue(landscapeToken);

    applicationRendererActions.cleanup();
    applicationRepositoryActions.cleanup();
    linkRendererActions.getAllLinks().forEach((externLink) => {
      externLink.removeFromParent();
    });
  };

  const onShareSettings = ({
    userId,
    originalMessage: { settings },
  }: ForwardedMessage<ShareSettingsMessage>): void => {
    userSettingsActions.updateSettings(settings as VisualizationSettings);

    const remoteUser = collaborationSessionActions.lookupRemoteUserById(userId);
    showInfoToastMessage('Applied settings from user ' + remoteUser?.userName);
  };

  const onRestructureModeUpdate = (): void => {
    landscapeRestructureActions.toggleRestructureModeLocally();
  };

  const onRestructureUpdate = ({
    originalMessage: { entityType, entityId, newName, appId, undo },
  }: ForwardedMessage<RestructureUpdateMessage>): void => {
    switch (entityType) {
      case 'APP':
        landscapeRestructureActions.renameApplication(
          newName,
          entityId,
          true,
          undo
        );
        break;
      case 'PACKAGE':
        landscapeRestructureActions.renamePackage(
          newName,
          entityId,
          true,
          undo
        );
        break;
      case 'SUBPACKAGE':
        landscapeRestructureActions.renameSubPackage(
          newName,
          entityId,
          true,
          undo
        );
        break;
      case 'CLAZZ':
        landscapeRestructureActions.renameClass(
          newName,
          entityId,
          appId as string,
          true,
          undo
        );
    }
  };

  const onRestructureCreateOrDelete = ({
    originalMessage: { action, entityType, name, language, entityId, undo },
  }: ForwardedMessage<RestructureCreateOrDeleteMessage>): void => {
    if (action === 'CREATE') {
      switch (entityType) {
        case 'APP':
          landscapeRestructureActions.addApplication(
            name as string,
            language as string,
            true
          );
          break;
        case 'PACKAGE':
          landscapeRestructureActions.addCollaborativePackage(
            entityId as string
          );
          break;
        case 'SUBPACKAGE':
          landscapeRestructureActions.addCollaborativeSubPackage(
            entityId as string
          );
          break;
        case 'CLAZZ':
          landscapeRestructureActions.addCollaborativeClass(entityId as string);
          break;
      }
    } else {
      switch (entityType) {
        case 'APP':
          landscapeRestructureActions.deleteCollaborativeApplication(
            entityId as string,
            undo as boolean
          );
          break;
        case 'PACKAGE':
          landscapeRestructureActions.deleteCollaborativePackage(
            entityId as string,
            undo as boolean
          );
          break;
        case 'CLAZZ':
          landscapeRestructureActions.deleteCollaborativeClass(
            entityId as string,
            undo as boolean
          );
          break;
      }
    }
  };

  const onRestructureDuplicateApp = ({
    originalMessage: { appId },
  }: ForwardedMessage<RestructureDuplicateAppMessage>): void => {
    const app = getApplicationInLandscapeById(
      landscapeRestructureState.landscapeData
        ?.structureLandscapeData as StructureLandscapeData,
      appId
    );
    landscapeRestructureActions.duplicateApp(app as Application, true);
  };

  const onRestructureCopyAndPastePackage = ({
    originalMessage: { destinationEntity, destinationId, clippedEntityId },
  }: ForwardedMessage<RestructureCopyAndPastePackageMessage>): void => {
    landscapeRestructureActions.pasteCollaborativePackage(
      destinationEntity,
      destinationId,
      clippedEntityId
    );
  };

  const onRestructureCopyAndPasteClass = ({
    originalMessage: { destinationId, clippedEntityId },
  }: ForwardedMessage<RestructureCopyAndPasteClassMessage>): void => {
    landscapeRestructureActions.pasteCollaborativeClass(
      destinationId,
      clippedEntityId
    );
  };

  const onRestructureCutAndInsert = ({
    originalMessage: {
      destinationEntity,
      destinationId,
      clippedEntity,
      clippedEntityId,
    },
  }: ForwardedMessage<RestructureCutAndInsertMessage>): void => {
    landscapeRestructureActions.insertCollaborativePackagerOrClass(
      destinationEntity,
      destinationId,
      clippedEntity,
      clippedEntityId
    );
  };

  const onRestructureCommunication = ({
    originalMessage: { sourceClassId, targetClassId, methodName },
  }: ForwardedMessage<RestructureCommunicationMessage>): void => {
    landscapeRestructureActions.addCollaborativeCommunication(
      sourceClassId,
      targetClassId,
      methodName
    );
  };

  const onRestructureDeleteCommunication = ({
    originalMessage: { undo, commId },
  }: ForwardedMessage<RestructureDeleteCommunicationMessage>): void => {
    const comm = landscapeRestructureState.allClassCommunications.find(
      (comm) => comm.id === commId
    );
    landscapeRestructureActions.deleteCommunication(
      comm as ClassCommunication,
      undo,
      true
    );
  };

  const onRestructureRenameOperationMessage = ({
    originalMessage: { commId, newName, undo },
  }: ForwardedMessage<RestructureRenameOperationMessage>): void => {
    const comm = landscapeRestructureState.allClassCommunications.find(
      (comm) => comm.id === commId
    );

    landscapeRestructureActions.renameOperation(
      comm as ClassCommunication,
      newName,
      true,
      undo
    );
  };

  const onRestructureRestoreApp = ({
    originalMessage: { appId, undoCutOperation },
  }: ForwardedMessage<RestructureRestoreAppMessage>): void => {
    const landscapeData =
      landscapeRestructureState.landscapeData?.structureLandscapeData;
    const app = getApplicationInLandscapeById(
      landscapeData as StructureLandscapeData,
      appId
    );
    landscapeRestructureActions.restoreApplication(
      app as Application,
      undoCutOperation,
      true
    );
  };

  const onRestructureRestorePackage = ({
    originalMessage: { pckgId, undoCutOperation },
  }: ForwardedMessage<RestructureRestorePackageMessage>): void => {
    const landscapeData =
      landscapeRestructureState.landscapeData?.structureLandscapeData;
    const pckg = getPackageById(
      landscapeData as StructureLandscapeData,
      pckgId
    );
    landscapeRestructureActions.restorePackage(
      pckg as Package,
      undoCutOperation,
      true
    );
  };

  const onRestructureRestoreClass = ({
    originalMessage: { appId, clazzId, undoCutOperation },
  }: ForwardedMessage<RestructureRestoreClassMessage>): void => {
    const landscapeData =
      landscapeRestructureState.landscapeData?.structureLandscapeData;
    const app = getApplicationInLandscapeById(
      landscapeData as StructureLandscapeData,
      appId
    );
    const clazz = getClassById(
      landscapeData as StructureLandscapeData,
      clazzId
    );
    landscapeRestructureActions.restoreClass(
      app as Application,
      clazz as Class,
      undoCutOperation,
      true
    );
  };

  const onChangeLogRemoveEntry = ({
    originalMessage: { entryIds },
  }: ForwardedMessage<ChangeLogRemoveEntryMessage>): void => {
    if (entryIds.length > 1) {
      const entries: BaseChangeLogEntry[] = [];
      entryIds.forEach((id) => {
        const foundEntry = changeLogState.changeLogEntries.find(
          (entry) => entry.id === id
        );
        entries.push(foundEntry as BaseChangeLogEntry);
      });

      changeLogActions.removeEntries(entries, true);
    } else {
      const foundEntry = changeLogState.changeLogEntries.find(
        (entry) => entry.id === entryIds[0]
      );

      changeLogActions.removeEntry(foundEntry as BaseChangeLogEntry, true);
    }
  };

  const onChangeLogRestoreEntriesMessage = ({
    originalMessage: { key },
  }: ForwardedMessage<ChangeLogRestoreEntriesMessage>): void => {
    changeLogActions.restoreDeletedEntries(key, true);
  };

  const onMousePingUpdate = ({
    userId,
    originalMessage: { modelId, position },
  }: ForwardedMessage<MousePingUpdateMessage>): void => {
    const remoteUser = collaborationSessionActions.lookupRemoteUserById(userId);
    if (!remoteUser) return;

    const applicationObj =
      applicationRendererActions.getApplicationById(modelId);

    const point = new THREE.Vector3().fromArray(position);
    if (applicationObj) {
      remoteUser.mousePing.ping(applicationObj, point, 5000, false);
    }

    const waypointIndicator = new WaypointIndicator({
      target: remoteUser.mousePing.mesh,
      color: remoteUser.color,
    });
    localUserState.defaultCamera.add(waypointIndicator);
  };

  // MARK: Effects

  useEffect(function registerEventListeners() {
    eventEmitter.on(MOUSE_PING_UPDATE_EVENT, onMousePingUpdate);
    eventEmitter.on(COMPONENT_UPDATE_EVENT, onComponentUpdate);
    eventEmitter.on(ALL_HIGHLIGHTS_RESET_EVENT, onAllHighlightsReset);
    eventEmitter.on(HIGHLIGHTING_UPDATE_EVENT, onHighlightingUpdate);
    eventEmitter.on(CHANGE_LANDSCAPE_EVENT, onChangeLandscape);
    eventEmitter.on(SHARE_SETTINGS_EVENT, onShareSettings);
    eventEmitter.on(RESTRUCTURE_MODE_UPDATE_EVENT, onRestructureModeUpdate);
    eventEmitter.on(RESTRUCTURE_UPDATE_EVENT, onRestructureUpdate);
    eventEmitter.on(
      RESTRUCTURE_CREATE_OR_DELETE_EVENT,
      onRestructureCreateOrDelete
    );
    eventEmitter.on(
      RESTRUCTURE_COPY_AND_PASTE_PACKAGE_EVENT,
      onRestructureCopyAndPastePackage
    );
    eventEmitter.on(
      RESTRUCTURE_COPY_AND_PASTE_CLASS_EVENT,
      onRestructureCopyAndPasteClass
    );
    eventEmitter.on(
      RESTRUCTURE_CUT_AND_INSERT_EVENT,
      onRestructureCutAndInsert
    );
    eventEmitter.on(
      RESTRUCTURE_COMMUNICATION_EVENT,
      onRestructureCommunication
    );
    eventEmitter.on(
      RESTRUCTURE_DELETE_COMMUNICATION_EVENT,
      onRestructureDeleteCommunication
    );
    eventEmitter.on(
      RESTRUCTURE_RENAME_OPERATION_EVENT,
      onRestructureRenameOperationMessage
    );
    eventEmitter.on(RESTRUCTURE_RESTORE_APP_EVENT, onRestructureRestoreApp);
    eventEmitter.on(
      RESTRUCTURE_RESTORE_PACKAGE_EVENT,
      onRestructureRestorePackage
    );
    eventEmitter.on(RESTRUCTURE_RESTORE_CLASS_EVENT, onRestructureRestoreClass);
    eventEmitter.on(CHANGELOG_REMOVE_ENTRY_EVENT, onChangeLogRemoveEntry);
    eventEmitter.on(
      CHANGELOG_RESTORE_ENTRIES_EVENT,
      onChangeLogRestoreEntriesMessage
    );
    eventEmitter.on(RESTRUCTURE_DUPLICATE_APP, onRestructureDuplicateApp);

    return function cleanupEventListeners() {
      eventEmitter.off(MOUSE_PING_UPDATE_EVENT, onMousePingUpdate);
      eventEmitter.off(COMPONENT_UPDATE_EVENT, onComponentUpdate);
      eventEmitter.off(ALL_HIGHLIGHTS_RESET_EVENT, onAllHighlightsReset);
      eventEmitter.off(HIGHLIGHTING_UPDATE_EVENT, onHighlightingUpdate);
      eventEmitter.off(CHANGE_LANDSCAPE_EVENT, onChangeLandscape);
      eventEmitter.off(SHARE_SETTINGS_EVENT, onShareSettings);
      eventEmitter.off(RESTRUCTURE_MODE_UPDATE_EVENT, onRestructureModeUpdate);
      eventEmitter.off(RESTRUCTURE_UPDATE_EVENT, onRestructureUpdate);
      eventEmitter.off(
        RESTRUCTURE_CREATE_OR_DELETE_EVENT,
        onRestructureCreateOrDelete
      );
      eventEmitter.off(
        RESTRUCTURE_COPY_AND_PASTE_PACKAGE_EVENT,
        onRestructureCopyAndPastePackage
      );
      eventEmitter.off(
        RESTRUCTURE_COPY_AND_PASTE_CLASS_EVENT,
        onRestructureCopyAndPasteClass
      );
      eventEmitter.off(
        RESTRUCTURE_CUT_AND_INSERT_EVENT,
        onRestructureCutAndInsert
      );
      eventEmitter.off(
        RESTRUCTURE_COMMUNICATION_EVENT,
        onRestructureCommunication
      );
      eventEmitter.off(
        RESTRUCTURE_DELETE_COMMUNICATION_EVENT,
        onRestructureDeleteCommunication
      );
      eventEmitter.off(
        RESTRUCTURE_RENAME_OPERATION_EVENT,
        onRestructureRenameOperationMessage
      );
      eventEmitter.off(RESTRUCTURE_RESTORE_APP_EVENT, onRestructureRestoreApp);
      eventEmitter.off(
        RESTRUCTURE_RESTORE_PACKAGE_EVENT,
        onRestructureRestorePackage
      );
      eventEmitter.off(
        RESTRUCTURE_RESTORE_CLASS_EVENT,
        onRestructureRestoreClass
      );
      eventEmitter.off(CHANGELOG_REMOVE_ENTRY_EVENT, onChangeLogRemoveEntry);
      eventEmitter.off(
        CHANGELOG_RESTORE_ENTRIES_EVENT,
        onChangeLogRestoreEntriesMessage
      );
      eventEmitter.off(RESTRUCTURE_DUPLICATE_APP, onRestructureDuplicateApp);
    };
  });
}
