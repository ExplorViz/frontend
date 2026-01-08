import { useEffect } from 'react';

import { useChangelogStore } from 'explorviz-frontend/src/stores/changelog';
import { useCollaborationSessionStore } from 'explorviz-frontend/src/stores/collaboration/collaboration-session';
import { useLocalUserStore } from 'explorviz-frontend/src/stores/collaboration/local-user';
import { useLandscapeRestructureStore } from 'explorviz-frontend/src/stores/landscape-restructure';
import { useLandscapeTokenStore } from 'explorviz-frontend/src/stores/landscape-token';
import { useApplicationRepositoryStore } from 'explorviz-frontend/src/stores/repos/application-repository';
import { useToastHandlerStore } from 'explorviz-frontend/src/stores/toast-handler';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import {
  closeComponent,
  openComponent,
} from 'explorviz-frontend/src/utils/application-rendering/entity-manipulation';
import {
  removeAllHighlighting,
  setHighlightingById,
} from 'explorviz-frontend/src/utils/application-rendering/highlighting';
import { BaseChangeLogEntry } from 'explorviz-frontend/src/utils/changelog-entry';
import { getClassById } from 'explorviz-frontend/src/utils/class-helpers';
import { ForwardedMessage } from 'explorviz-frontend/src/utils/collaboration/web-socket-messages/receivable/forwarded';
import {
  CHANGE_LANDSCAPE_EVENT,
  ChangeLandscapeMessage,
} from 'explorviz-frontend/src/utils/collaboration/web-socket-messages/sendable/change-landscape';
import {
  CHANGELOG_REMOVE_ENTRY_EVENT,
  CHANGELOG_RESTORE_ENTRIES_EVENT,
  ChangeLogRemoveEntryMessage,
  ChangeLogRestoreEntriesMessage,
} from 'explorviz-frontend/src/utils/collaboration/web-socket-messages/sendable/changelog-update';
import {
  COMPONENT_UPDATE_EVENT,
  ComponentUpdateMessage,
} from 'explorviz-frontend/src/utils/collaboration/web-socket-messages/sendable/component-update';
import {
  HIGHLIGHTING_UPDATE_EVENT,
  HighlightingUpdateMessage,
} from 'explorviz-frontend/src/utils/collaboration/web-socket-messages/sendable/highlighting-update';
import {
  PING_UPDATE_EVENT,
  PingUpdateMessage,
} from 'explorviz-frontend/src/utils/collaboration/web-socket-messages/sendable/ping-update';
import { RESET_HIGHLIGHTING_EVENT } from 'explorviz-frontend/src/utils/collaboration/web-socket-messages/sendable/reset-highlighting';
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
} from 'explorviz-frontend/src/utils/collaboration/web-socket-messages/sendable/restructure-update';
import {
  SHARE_SETTINGS_EVENT,
  ShareSettingsMessage,
} from 'explorviz-frontend/src/utils/collaboration/web-socket-messages/sendable/share-settings';
import eventEmitter from 'explorviz-frontend/src/utils/event-emitter';
import ClassCommunication from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/class-communication';
import {
  Application,
  Class,
  Package,
  StructureLandscapeData,
} from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import { getApplicationInLandscapeById } from 'explorviz-frontend/src/utils/landscape-structure-helpers';
import { getPackageById } from 'explorviz-frontend/src/utils/package-helpers';
import { VisualizationSettings } from 'explorviz-frontend/src/utils/settings/settings-schemas';
import {
  pingByModelId,
  pingPosition,
} from 'explorviz-frontend/src/view-objects/3d/application/animated-ping-r3f';
import * as THREE from 'three';
import { useShallow } from 'zustand/react/shallow';

export default function useCollaborativeModifier() {
  // MARK: Stores

  const collaborationSessionActions = useCollaborationSessionStore(
    useShallow((state) => ({
      lookupRemoteUserById: state.lookupRemoteUserById,
    }))
  );

  const applicationRepositoryActions = useApplicationRepositoryStore(
    useShallow((state) => ({
      cleanup: state.cleanup,
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
    originalMessage: { componentIds, areOpened },
  }: ForwardedMessage<ComponentUpdateMessage>): void => {
    if (areOpened) {
      componentIds.forEach((componentId) => {
        openComponent(componentId, false);
      });
    } else {
      componentIds.forEach((componentId) => {
        closeComponent(componentId, false);
      });
    }
  };

  const onAllHighlightsReset = (): void => {
    removeAllHighlighting(false);
  };

  const onHighlightingUpdate = ({
    userId,
    originalMessage: { entityIds, areHighlighted },
  }: ForwardedMessage<HighlightingUpdateMessage>): void => {
    const user = collaborationSessionActions.lookupRemoteUserById(userId);
    if (!user) return;

    if (areHighlighted) {
      user.highlightedEntityIds = user.highlightedEntityIds.union(
        new Set(entityIds)
      );
    } else {
      user.highlightedEntityIds = user.highlightedEntityIds.difference(
        new Set(entityIds)
      );
    }

    entityIds.forEach((entityId) => {
      setHighlightingById(entityId, areHighlighted, false);
    });
  };

  const onChangeLandscape = ({
    // userId,
    originalMessage: { landscapeToken },
  }: ForwardedMessage<ChangeLandscapeMessage>): void => {
    if (landscapeTokenState.token?.value === landscapeToken) {
      return;
    }
    landscapeTokenActions.setTokenByValue(landscapeToken);

    applicationRepositoryActions.cleanup();
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

  const onPingUpdate = ({
    userId,
    originalMessage: { positions, modelIds },
  }: ForwardedMessage<PingUpdateMessage>): void => {
    const remoteUser = collaborationSessionActions.lookupRemoteUserById(userId);
    if (!remoteUser) return;
    const pingColor = remoteUser.color;

    positions.forEach((pos) => {
      const position = new THREE.Vector3(pos[0], pos[1], pos[2]);
      pingPosition(position, pingColor, false);
    });

    modelIds.forEach((modelId) => {
      pingByModelId(modelId, false, { color: pingColor });
    });

    // TODO:
    // const waypointIndicator = new WaypointIndicator({
    //   target: remoteUser.mousePing.mesh,
    //   color: remoteUser.color,
    // });
    //localUserState.defaultCamera.add(waypointIndicator);
  };

  // MARK: Effects

  useEffect(function registerEventListeners() {
    eventEmitter.on(PING_UPDATE_EVENT, onPingUpdate);
    eventEmitter.on(COMPONENT_UPDATE_EVENT, onComponentUpdate);
    eventEmitter.on(RESET_HIGHLIGHTING_EVENT, onAllHighlightsReset);
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
      eventEmitter.off(PING_UPDATE_EVENT, onPingUpdate);
      eventEmitter.off(COMPONENT_UPDATE_EVENT, onComponentUpdate);
      eventEmitter.off(RESET_HIGHLIGHTING_EVENT, onAllHighlightsReset);
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
