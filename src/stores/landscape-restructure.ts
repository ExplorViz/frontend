import { create } from 'zustand';
import { LandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/landscape-data';
import {
  addFoundationToLandscape,
  addMethodToClass,
  movePackage,
  moveClass,
  removeApplication,
  removeClassFromPackage,
  removePackageFromApplication,
  getClassInApplicationById,
  createPackage,
  createClass,
  changeID,
  copyPackageContent,
  copyClassContent,
  restoreID,
  removeAffectedCommunications,
  canDeleteClass,
  canDeletePackage,
  pastePackage,
  pasteClass,
  duplicateApplication,
} from 'explorviz-frontend/src/utils/restructure-helper';
import {
  Application,
  Class,
  Package,
  isApplication,
  isClass,
  isPackage,
  StructureLandscapeData,
  TypeOfAnalysis,
} from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import {
  getApplicationFromClass,
  getApplicationFromPackage,
  getApplicationFromSubPackage,
  getApplicationInLandscapeById,
} from 'explorviz-frontend/src/utils/landscape-structure-helpers';
import {
  getClassesInPackage,
  getPackageById,
  getSubPackagesOfPackage,
} from 'explorviz-frontend/src/utils/package-helpers';
import { getClassById } from 'explorviz-frontend/src/utils/class-helpers';
import ApplicationObject3D from 'explorviz-frontend/src/view-objects/3d/application/application-object-3d';
import {
  RestructureAction,
  EntityType,
} from 'explorviz-frontend/src/utils/restructure-helper';
import ComponentMesh from 'explorviz-frontend/src/view-objects/3d/application/component-mesh';
import ClazzMesh from 'explorviz-frontend/src/view-objects/3d/application/clazz-mesh';
import * as THREE from 'three';
import ClazzCommunicationMesh from 'explorviz-frontend/src/view-objects/3d/application/clazz-communication-mesh';
import {
  getAllClassesInApplication,
  getAllPackagesInApplication,
} from 'explorviz-frontend/src/utils/application-helpers';
import {
  AppChangeLogEntry,
  BaseChangeLogEntry,
  ClassChangeLogEntry,
  CommunicationChangeLogEntry,
  PackageChangeLogEntry,
  SubPackageChangeLogEntry,
} from 'explorviz-frontend/src/utils/changelog-entry';
import ClassCommunication from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/class-communication';
import eventEmitter from '../utils/event-emitter';
import { useApplicationRendererStore } from './application-renderer';
import { useChangelogStore } from './changelog';
import { useLinkRendererStore } from 'explorviz-frontend/src/stores/link-renderer';
import { useMessageSenderStore } from 'explorviz-frontend/src/stores/collaboration/message-sender';
import { useToastHandlerStore } from 'explorviz-frontend/src/stores/toast-handler';
import { useUserSettingsStore } from './user-settings';

type MeshModelTextureMapping = {
  action: RestructureAction;
  meshType: EntityType;
  texturePath: string;
  app: Application;
  pckg?: Package;
  clazz?: Class;
};

type CommModelColorMapping = {
  action: RestructureAction;
  comm: ClassCommunication;
  color: THREE.Color;
};

type diverseDataModel = Application | Package | Class | ClassCommunication;

interface LandscapeRestructureState {
  restructureMode: boolean; // tracked
  landscapeData: LandscapeData | null; // tracked
  newMeshCounter: number; // tracked
  meshModelTextureMappings: MeshModelTextureMapping[]; // tracked
  commModelColorMappings: CommModelColorMapping[]; // tracked
  deletedDataModels: diverseDataModel[]; // tracked
  canvas?: HTMLCanvasElement; // tracked
  clipboard: string; // tracked
  clippedMesh: Package | Class | null; // tracked
  createdClassCommunication: ClassCommunication[]; // tracked
  allClassCommunications: ClassCommunication[]; // tracked
  copiedClassCommunications: Map<string, ClassCommunication[]>; // tracked
  updatedClassCommunications: Map<string, ClassCommunication[]>; // tracked
  completelyDeletedClassCommunications: Map<string, ClassCommunication[]>; // tracked
  deletedClassCommunications: ClassCommunication[]; // tracked
  sourceClass: Class | null; // tracked
  targetClass: Class | null; // tracked
  resetLandscapeRestructure: () => void;
  setSourceOrTargetClass: (type: string) => void;
  setCommunicationSourceClass: (clazz: Class | null) => void;
  setCommunicationTargetClass: (clazz: Class | null) => void;
  addCollaborativeCommunication: (
    sourceClassId: string,
    targetClassId: string,
    methodName: string
  ) => void;
  addCommunication: (methodName: string, collabMode?: boolean) => void;
  deleteCommunication: (
    comm: ClassCommunication,
    undo?: boolean,
    collabMode?: boolean
  ) => void;
  toggleRestructureMode: () => void;
  toggleRestructureModeLocally: () => Promise<void>;
  setLandscapeData: (newData: LandscapeData | null) => void;
  duplicateApp: (app: Application, collabMode?: boolean) => void;
  renameApplication: (
    name: string,
    id: string,
    collabMode?: boolean,
    undo?: boolean
  ) => void;
  renamePackage: (
    name: string,
    id: string,
    collabMode?: boolean,
    undo?: boolean
  ) => void;
  renameSubPackage: (
    name: string,
    id: string,
    collabMode?: boolean,
    undo?: boolean
  ) => void;
  getAppFromPackage: (pckg: Package) => Application | undefined;
  renameClass: (
    name: string,
    id: string,
    appId: string,
    collabMode?: boolean,
    undo?: boolean
  ) => void;
  renameOperation: (
    communication: ClassCommunication,
    newName: string,
    collabMode?: boolean,
    undo?: boolean
  ) => void;
  restoreApplication: (
    app: Application,
    undoCutOperation: boolean,
    collabMode?: boolean
  ) => void;
  restorePackage: (
    pckg: Package,
    undoCutOperation: boolean,
    collabMode?: boolean
  ) => void;
  restoreClass: (
    app: Application,
    clazz: Class,
    undoCutOperation: boolean,
    collabMode?: boolean
  ) => void;
  removeInsertTexture: (element: Package) => void;
  undoDuplicateApp: (app: Application) => void;
  undoCopyPackage: (app: Application, pckg: Package) => void;
  undoCopyClass: (app: Application, clazz: Class) => void;
  addApplication: (
    appName: string,
    language: string,
    collabMode?: boolean
  ) => void;
  applyColorMappings: () => void;
  _getCommMesh: (
    elem: CommModelColorMapping
  ) => ClazzCommunicationMesh | undefined;
  applyTextureMappings: () => void;
  _findAppliedTexture: (
    elem: Application | Package | Class,
    action?: RestructureAction
  ) => MeshModelTextureMapping | undefined;
  addCollaborativeSubPackage: (pckgId: string) => void;
  addSubPackage: (pckg: Package, collabMode?: boolean) => void;
  addCollaborativePackage: (appId: string) => void;
  addPackage: (app: Application, collabMode?: boolean) => void;
  addCollaborativeClass: (pckgId: string) => void;
  addClass: (pckg: Package, collabMode?: boolean) => void;
  deleteCollaborativeApplication: (appId: string, undo?: boolean) => void;
  deleteApp: (app: Application, collabMode?: boolean, undo?: boolean) => void;
  _processDeletedAppData: (app: Application) => void;
  deleteCollaborativePackage: (pckgId: string, undo?: boolean) => void;
  deletePackage: (pckg: Package, collabMode?: boolean, undo?: boolean) => void;
  storeDeletedAppData: (app: Application) => void;
  restoreDeletedAppData: (app: Application) => void;
  storeDeletedPackageData: (pckg: Package) => void;
  restoreDeletedPackageData: (pckg: Package) => void;
  deleteCollaborativeClass: (clazzId: string, undo?: boolean) => void;
  deleteClass: (clazz: Class, collabMode?: boolean, undo?: boolean) => void;
  cutPackage: (pckg: Package) => void;
  cutClass: (clazz: Class) => void;
  resetClipboard: () => void;
  pasteCollaborativePackage: (
    destinationEntity: string,
    destinationId: string,
    clippedEntityId: string
  ) => void;
  pasteCollaborativeClass: (
    destinationId: string,
    clippedEntityId: string
  ) => void;
  insertCollaborativePackagerOrClass: (
    detinationEntity: string,
    destinationId: string,
    clippedEntity: string,
    clippedEntityId: string
  ) => void;
  getApp(appChild: Package | Class): Application | undefined;
  pastePackage: (
    destination: Application | Package,
    collabMode?: boolean
  ) => void;
  pasteClass: (destination: Package, collabMode?: boolean) => void;
  movePackageOrClass(
    destination: Application | Package,
    collabMode?: boolean
  ): void;
  undoBundledEntries(bundledCreateEntries: BaseChangeLogEntry[]): void;
  undoEntry: (entry: BaseChangeLogEntry) => void;
  removeMeshModelTextureMapping: (
    action: RestructureAction,
    entityType: EntityType,
    app: Application,
    pckg?: Package,
    clazz?: Class
  ) => void;
  _sendCutInsertMessage(destination: Application | Package): void;
  removeCopiedClassCommunication: (key: string) => void;
  setCanvas: (canvas: HTMLCanvasElement) => void;
  setAllClassCommunications: (
    allClassCommunications: ClassCommunication[]
  ) => void;
  _addOriginOfData: (entity: Package) => Package;
}

export const useLandscapeRestructureStore = create<LandscapeRestructureState>(
  (set, get) => ({
    restructureMode: false,
    landscapeData: null,
    meshModelTextureMappings: [],
    commModelColorMappings: [],
    deletedDataModels: [],
    newMeshCounter: 1,
    canvas: undefined,
    clipboard: '',
    clippedMesh: null,
    createdClassCommunication: [],
    allClassCommunications: [],
    copiedClassCommunications: new Map<string, ClassCommunication[]>(),
    removeCopiedClassCommunication,
    updatedClassCommunications: new Map<string, ClassCommunication[]>(),
    completelyDeletedClassCommunications: new Map<
      string,
      ClassCommunication[]
    >(),
    deletedClassCommunications: [],
    sourceClass: null,
    targetClass: null,

    resetLandscapeRestructure: () => {
      set({
        restructureMode: false,
        landscapeData: null,
        newMeshCounter: 1,
        meshModelTextureMappings: [],
        commModelColorMappings: [],
        deletedDataModels: [],
        clipboard: '',
        clippedMesh: null,
        createdClassCommunication: [],
        allClassCommunications: [],
        copiedClassCommunications: new Map(),
        updatedClassCommunications: new Map(),
        completelyDeletedClassCommunications: new Map(),
        deletedClassCommunications: [],
        sourceClass: null,
        targetClass: null,
      });
      useChangelogStore.getState().resetChangeLog();
      eventEmitter.emit('showChangeLog');
    },

    setSourceOrTargetClass: (type: string) => {
      if (type == 'source' && isClass(get().clippedMesh))
        set({ sourceClass: get().clippedMesh });
      else if (type == 'target' && isClass(get().clippedMesh))
        set({ targetClass: get().clippedMesh });
    },

    setCommunicationSourceClass: (clazz: Class | null) => {
      set({ sourceClass: clazz });
    },

    setCommunicationTargetClass: (clazz: Class | null) => {
      set({ targetClass: clazz });
    },

    addCollaborativeCommunication: (
      sourceClassId: string,
      targetClassId: string,
      methodName: string
    ) => {
      set({
        sourceClass: getClassById(
          get().landscapeData?.structureLandscapeData as StructureLandscapeData,
          sourceClassId
        ) as Class,
      });
      set({
        targetClass: getClassById(
          get().landscapeData?.structureLandscapeData as StructureLandscapeData,
          targetClassId
        ) as Class,
      });
      get().addCommunication(methodName, true);
    },

    addCommunication: (methodName: string, collabMode: boolean = false) => {
      if (
        methodName === '' ||
        get().sourceClass === null ||
        get().targetClass === null
      ) {
        useToastHandlerStore
          .getState()
          .showErrorToastMessage('Missing communication data');
        return;
      }

      if (get().sourceClass === get().targetClass) {
        useToastHandlerStore
          .getState()
          .showErrorToastMessage('Select 2 different classes');
        return;
      }

      if (!collabMode)
        useMessageSenderStore
          .getState()
          .sendRestructureCommunicationMessage(
            get().sourceClass?.id as string,
            get().targetClass?.id as string,
            methodName
          );

      if (
        get().sourceClass &&
        get().targetClass &&
        get().landscapeData?.structureLandscapeData
      ) {
        const sourceApp = getApplicationFromClass(
          get().landscapeData!.structureLandscapeData,
          get().sourceClass!
        );
        const targetApp = getApplicationFromClass(
          get().landscapeData!.structureLandscapeData,
          get().targetClass!
        );

        addMethodToClass(get().targetClass!, methodName);

        // Create model of communication between two classes
        const classCommunication: ClassCommunication = {
          id:
            get().sourceClass!.name +
            ' => ' +
            get().targetClass!.name +
            '|' +
            methodName,
          methodCalls: [],
          isRecursive: get().sourceClass!.id === get().targetClass!.id,
          isBidirectional: false,
          totalRequests: 1,
          metrics: { normalizedRequestCount: 1 },
          sourceClass: get().sourceClass!,
          targetClass: get().targetClass!,
          operationName: methodName,
          sourceApp: sourceApp!,
          targetApp: targetApp!,
          addMethodCalls: () => {},
          getClasses: () => [get().sourceClass!, get().targetClass!],
        };

        // Create the Changelog Entry
        useChangelogStore.getState().communicationEntry(classCommunication);

        set({
          createdClassCommunication: [
            ...get().createdClassCommunication,
            classCommunication,
          ],
        });

        set({
          commModelColorMappings: [
            ...get().commModelColorMappings,
            {
              action: RestructureAction.Communication,
              comm: classCommunication,
              color: new THREE.Color(0xbc42f5),
            },
          ],
        });
        eventEmitter.emit('showChangeLog');
        eventEmitter.emit(
          'restructureLandscapeData',
          get().landscapeData?.structureLandscapeData,
          get().landscapeData?.dynamicLandscapeData
        );
      }
    },

    deleteCommunication: (
      comm: ClassCommunication,
      undo: boolean = false,
      collabMode: boolean = false
    ) => {
      if (!collabMode) {
        useMessageSenderStore
          .getState()
          .sendRestructureDeleteCommunicationMessage(undo, comm.id);
      }
      if (undo) {
        const newCreatedComm = comm.id.includes(' => ');
        if (newCreatedComm) {
          set({
            createdClassCommunication: get().createdClassCommunication.filter(
              (c) => c != comm
            ),
          });
          set({
            commModelColorMappings: get().commModelColorMappings.slice(0, -1),
          });
        } else {
          set({
            deletedClassCommunications: get().deletedClassCommunications.filter(
              (d) => d != comm
            ),
          });
          const newCommModelColorMappings = get().commModelColorMappings.slice(
            0,
            -1
          );
          const commMapping = get().commModelColorMappings.pop();
          set({ commModelColorMappings: newCommModelColorMappings });
          const commMesh = get()._getCommMesh(commMapping!);
          const commColor = new THREE.Color(
            useUserSettingsStore.getState().visualizationSettings.communicationColor.value
          );

          commMesh?.changeColor(commColor);
          set({
            deletedDataModels: get().deletedDataModels.filter((d) => d != comm),
          });
        }
      } else {
        const newCreatedComm = comm.id.includes(' => ');
        if (newCreatedComm) {
          set({
            createdClassCommunication: get().createdClassCommunication.filter(
              (c) => comm
            ),
          });
        } else {
          set({
            deletedClassCommunications: [
              ...get().deletedClassCommunications,
              comm,
            ],
            commModelColorMappings: [
              ...get().commModelColorMappings,
              {
                action: RestructureAction.Communication,
                comm: comm,
                color: new THREE.Color(0x1c1c1c),
              },
            ],
          });
        }

        useChangelogStore.getState().deleteCommunicationEntry(comm);
        set({ deletedDataModels: [...get().deletedDataModels, comm] });
      }
      eventEmitter.emit('showChangeLog');
      eventEmitter.emit(
        'restructureLandscapeData',
        get().landscapeData?.structureLandscapeData,
        get().landscapeData?.dynamicLandscapeData
      );
    },

    toggleRestructureMode: () => {
      set({ restructureMode: !get().restructureMode });
      eventEmitter.emit('restructureMode');
      useMessageSenderStore.getState().sendRestructureModeUpdate();
    },

    toggleRestructureModeLocally: async () => {
      set({ restructureMode: !get().restructureMode });
      eventEmitter.emit('openSettingsSidebar');
      eventEmitter.emit('restructureComponent', 'Restructure-Landscape');
      await new Promise((f) => setTimeout(f, 500));
      eventEmitter.emit('restructureMode');
    },

    setLandscapeData: (newData: LandscapeData | null) => {
      set({ landscapeData: newData });
    },

    duplicateApp: (app: Application, collabMode: boolean = false) => {
      if (get().landscapeData?.structureLandscapeData) {
        if (!collabMode) {
          useMessageSenderStore
            .getState()
            .sendRestructureDuplicateAppMessage(app.id);
        }

        const wrapper = {
          idCounter: get().newMeshCounter,
          comms: get().allClassCommunications,
          copiedComms: [],
        };

        const duplicatedApp = duplicateApplication(
          get().landscapeData!.structureLandscapeData,
          app,
          wrapper
        );

        set({ newMeshCounter: get().newMeshCounter++ });

        useChangelogStore.getState().duplicateAppEntry(duplicatedApp);

        set({
          meshModelTextureMappings: [
            ...get().meshModelTextureMappings,
            {
              action: RestructureAction.CopyPaste,
              meshType: EntityType.App,
              texturePath: 'images/x.png',
              app: duplicatedApp,
            },
          ],
        });

        const key = 'DUPLICATED|' + duplicatedApp.id;

        let newCopiedClassCommunications = new Map(
          get().copiedClassCommunications
        );
        newCopiedClassCommunications.set(key, wrapper.copiedComms);
        set({ copiedClassCommunications: newCopiedClassCommunications });

        eventEmitter.emit('showChangeLog');
        eventEmitter.emit(
          'restructureLandscapeData',
          get().landscapeData?.structureLandscapeData,
          get().landscapeData?.dynamicLandscapeData
        );
      }
    },

    renameApplication: (
      name: string,
      id: string,
      collabMode: boolean = false,
      undo: boolean = false
    ) => {
      if (get().landscapeData?.structureLandscapeData) {
        if (!collabMode)
          useMessageSenderStore
            .getState()
            .sendRestructureUpdate(EntityType.App, id, name, null, undo);

        const app = getApplicationInLandscapeById(
          get().landscapeData!.structureLandscapeData,
          id
        );

        if (app) {
          if (!undo) {
            // Create Changelog Entry
            useChangelogStore.getState().renameAppEntry(app, name);

            set({
              meshModelTextureMappings: [
                ...get().meshModelTextureMappings,
                {
                  action: RestructureAction.Rename,
                  meshType: EntityType.App,
                  texturePath: 'images/hashtag.png',
                  app: app as Application,
                },
              ],
            });
          } else {
            const undoMapping = get().meshModelTextureMappings.find(
              (mapping) =>
                mapping.action === RestructureAction.Rename &&
                mapping.meshType === EntityType.App &&
                mapping.app === app
            );
            set({
              meshModelTextureMappings: get().meshModelTextureMappings.filter(
                (m) => m != (undoMapping as MeshModelTextureMapping)
              ),
            });
          }
          // Set new Application name
          app.name = name; // TODO: Does this trigger any rerendering?

          eventEmitter.emit('showChangeLog');
          eventEmitter.emit(
            'restructureLandscapeData',
            get().landscapeData?.structureLandscapeData,
            get().landscapeData?.dynamicLandscapeData
          );
        }
      }
    },

    renamePackage: (
      name: string,
      id: string,
      collabMode: boolean = false,
      undo: boolean = false
    ) => {
      if (get().landscapeData?.structureLandscapeData) {
        if (!collabMode)
          useMessageSenderStore
            .getState()
            .sendRestructureUpdate(EntityType.Package, id, name, null, undo);

        const pckg = getPackageById(
          get().landscapeData!.structureLandscapeData,
          id
        );

        if (pckg) {
          const app = get().getAppFromPackage(pckg);

          if (!undo) {
            // Create Changelog Entry
            if (!pckg.parent && app)
              useChangelogStore.getState().renamePackageEntry(app, pckg, name);
            else if (pckg.parent && app)
              useChangelogStore
                .getState()
                .renameSubPackageEntry(app, pckg, name);

            set({
              meshModelTextureMappings: [
                ...get().meshModelTextureMappings,
                {
                  action: RestructureAction.Rename,
                  meshType: EntityType.Package,
                  texturePath: 'images/hashtag.png',
                  app: app as Application,
                  pckg: pckg,
                },
              ],
            });
          } else {
            const undoMapping = get().meshModelTextureMappings.find(
              (mapping) =>
                mapping.action === RestructureAction.Rename &&
                mapping.meshType === EntityType.Package &&
                mapping.app === app &&
                mapping.pckg === pckg
            );

            set({
              meshModelTextureMappings: get().meshModelTextureMappings.filter(
                (m) => m != (undoMapping as MeshModelTextureMapping)
              ),
            });
          }

          // Set new Package name
          pckg.name = name; // TODO: Does this trigger any rerendering?

          eventEmitter.emit('showChangeLog');
          eventEmitter.emit(
            'restructureLandscapeData',
            get().landscapeData?.structureLandscapeData,
            get().landscapeData?.dynamicLandscapeData
          );
        }
      }
    },

    renameSubPackage: (
      name: string,
      id: string,
      collabMode: boolean = false,
      undo: boolean = false
    ) => {
      if (get().landscapeData?.structureLandscapeData) {
        if (!collabMode)
          useMessageSenderStore
            .getState()
            .sendRestructureUpdate(EntityType.SubPackage, id, name, null, undo);

        const pckg = getPackageById(
          get().landscapeData!.structureLandscapeData,
          id
        );

        if (pckg) {
          const app = get().getAppFromPackage(pckg);

          if (!undo) {
            // Create Changelog Entry
            if (app)
              useChangelogStore
                .getState()
                .renameSubPackageEntry(app, pckg, name);

            set({
              meshModelTextureMappings: [
                ...get().meshModelTextureMappings,
                {
                  action: RestructureAction.Rename,
                  meshType: EntityType.Package,
                  texturePath: 'images/hashtag.png',
                  app: app as Application,
                  pckg: pckg,
                },
              ],
            });
          } else {
            const undoMapping = get().meshModelTextureMappings.find(
              (mapping) =>
                mapping.action === RestructureAction.Rename &&
                mapping.meshType === EntityType.Package &&
                mapping.app === app &&
                mapping.pckg === pckg
            );
            set({
              meshModelTextureMappings: get().meshModelTextureMappings.filter(
                (m) => m != (undoMapping as MeshModelTextureMapping)
              ),
            });
          }

          // Set new Package name
          pckg.name = name; // TODO: Does this trigger any rerendering?

          eventEmitter.emit('showChangeLog');
          eventEmitter.emit(
            'restructureLandscapeData',
            get().landscapeData?.structureLandscapeData,
            get().landscapeData?.dynamicLandscapeData
          );
        }
      }
    },

    getAppFromPackage: (pckg: Package) => {
      let app: Application | undefined;
      if (get().landscapeData?.structureLandscapeData) {
        if (!pckg.parent)
          app = getApplicationFromPackage(
            get().landscapeData
              ?.structureLandscapeData as StructureLandscapeData,
            pckg.id
          );
        else
          app = getApplicationFromSubPackage(
            get().landscapeData
              ?.structureLandscapeData as StructureLandscapeData,
            pckg.id
          );
      }
      return app;
    },

    renameClass: (
      name: string,
      id: string,
      appId: string,
      collabMode: boolean = false,
      undo: boolean = false
    ) => {
      if (get().landscapeData?.structureLandscapeData) {
        if (!collabMode)
          useMessageSenderStore
            .getState()
            .sendRestructureUpdate(EntityType.Clazz, id, name, appId, undo);

        const application = getApplicationInLandscapeById(
          get().landscapeData!.structureLandscapeData,
          appId
        );
        if (application) {
          const clazzToRename = getClassInApplicationById(application, id);

          if (clazzToRename) {
            if (!undo) {
              // Create Changelog Entry
              useChangelogStore
                .getState()
                .renameClassEntry(application, clazzToRename, name);

              set({
                meshModelTextureMappings: [
                  ...get().meshModelTextureMappings,
                  {
                    action: RestructureAction.Rename,
                    meshType: EntityType.Clazz,
                    texturePath: 'images/hashtag.png',
                    app: application as Application,
                    clazz: clazzToRename,
                  },
                ],
              });
            } else {
              const undoMapping = get().meshModelTextureMappings.find(
                (mapping) =>
                  mapping.action === RestructureAction.Rename &&
                  mapping.meshType === EntityType.Clazz &&
                  mapping.app === application &&
                  mapping.clazz === clazzToRename
              );
              set({
                meshModelTextureMappings: get().meshModelTextureMappings.filter(
                  (m) => m != (undoMapping as MeshModelTextureMapping)
                ),
              });
            }

            // Set new Class name
            clazzToRename.name = name; // TODO: Does this trigger any rerendering?

            eventEmitter.emit('showChangeLog');
            eventEmitter.emit(
              'restructureLandscapeData',
              get().landscapeData?.structureLandscapeData,
              get().landscapeData?.dynamicLandscapeData
            );
          }
        }
      }
    },

    renameOperation: (
      communication: ClassCommunication,
      newName: string,
      collabMode: boolean = false,
      undo: boolean = false
    ) => {
      if (!collabMode) {
        useMessageSenderStore
          .getState()
          .sendRestructureRenameOperationMessage(
            communication.id,
            newName,
            undo
          );
      }

      const key = 'RENAMED|' + communication.id;
      const found = get().updatedClassCommunications.has(key);

      if (!undo) {
        useChangelogStore
          .getState()
          .renameOperationEntry(communication, newName);
        communication.operationName = newName; // TODO: Does this trigger any rerendering?

        // If the communication was not updated before, then create an entry
        if (!found) {
          let newUpdatedClassCommunications = new Map(
            get().updatedClassCommunications
          );
          newUpdatedClassCommunications.set(key as string, [communication]);
          set({ updatedClassCommunications: newUpdatedClassCommunications });
        }
      } else {
        let newUpdatedClassCommunications = new Map(
          get().updatedClassCommunications
        );
        newUpdatedClassCommunications.delete(key);
        set({ updatedClassCommunications: newUpdatedClassCommunications });
        communication.operationName = newName; // TODO: Does this trigger any rerendering?
      }

      eventEmitter.emit('showChangeLog');
      eventEmitter.emit(
        'restructureLandscapeData',
        get().landscapeData?.structureLandscapeData,
        get().landscapeData?.dynamicLandscapeData
      );
    },

    restoreApplication: (
      app: Application,
      undoCutOperation: boolean = false,
      collabMode: boolean = false
    ) => {
      if (!collabMode) {
        useMessageSenderStore
          .getState()
          .sendRestructureRestoreAppMessage(app.id, undoCutOperation);
      }

      get().restoreDeletedAppData(app as Application);
      const undoMapping = get().meshModelTextureMappings.find(
        (mapping) =>
          mapping.action === RestructureAction.Delete &&
          mapping.meshType === EntityType.App &&
          mapping.app === app
      );
      set({
        meshModelTextureMappings: get().meshModelTextureMappings.filter(
          (m) => m != (undoMapping as MeshModelTextureMapping)
        ),
      });
      if (undoCutOperation) {
        if (get().createdClassCommunication.length) {
          // TODO: Does this work? Changing the value for each object
          get().createdClassCommunication.forEach((comm) => {
            if (!comm.sourceApp) {
              comm.sourceApp = app;
            }
            if (!comm.targetApp) {
              comm.targetApp = app;
            }
          });
        }
        restoreID({ entity: app }, 'removed|');
      } else {
        let newCompletelyDeletedClassCommunications = new Map(
          get().completelyDeletedClassCommunications
        );
        newCompletelyDeletedClassCommunications.delete(app.id);
        set({
          completelyDeletedClassCommunications:
            newCompletelyDeletedClassCommunications,
        });
      }

      eventEmitter.emit('showChangeLog');
      eventEmitter.emit(
        'restructureLandscapeData',
        get().landscapeData?.structureLandscapeData,
        get().landscapeData?.dynamicLandscapeData
      );
    },

    restorePackage: (
      pckg: Package,
      undoCutOperation: boolean = false,
      collabMode: boolean = false
    ) => {
      if (!collabMode) {
        useMessageSenderStore
          .getState()
          .sendRestructureRestorePackageMessage(pckg.id, undoCutOperation);
      }

      get().restoreDeletedPackageData(pckg as Package);
      const undoMapping = get().meshModelTextureMappings.find(
        (mapping) =>
          mapping.action === RestructureAction.Delete &&
          mapping.meshType === EntityType.Package &&
          mapping.pckg === pckg
      );
      set({
        meshModelTextureMappings: get().meshModelTextureMappings.filter(
          (m) => m != (undoMapping as MeshModelTextureMapping)
        ),
      });

      // Cut or Undo Operation? In case of Cut we also need to restore the communications!
      if (undoCutOperation) {
        const keyToRemove = 'CUTINSERT|' + pckg.id;

        let newUpdatedClassCommunications = new Map(
          get().updatedClassCommunications
        );
        newUpdatedClassCommunications.delete(keyToRemove);
        set({ updatedClassCommunications: newUpdatedClassCommunications });

        const app = get().getApp(pckg)!;
        if (get().createdClassCommunication.length) {
          // TODO: Does this work for overwriting attributes of comm?
          get().createdClassCommunication.forEach((comm) => {
            if (!comm.sourceApp) {
              comm.sourceApp = app;
            }
            if (!comm.targetApp) {
              comm.targetApp = app;
            }
          });
        }
        get().removeMeshModelTextureMapping(
          RestructureAction.CutInsert,
          EntityType.Package,
          app as Application,
          pckg
        );
        restoreID({ entity: pckg }, 'removed|');
      } else {
        let newCompletelyDeletedClassCommunications = new Map(
          get().completelyDeletedClassCommunications
        );
        newCompletelyDeletedClassCommunications.delete(pckg.id);
        set({
          completelyDeletedClassCommunications:
            newCompletelyDeletedClassCommunications,
        });
      }

      eventEmitter.emit('showChangeLog');
      eventEmitter.emit(
        'restructureLandscapeData',
        get().landscapeData?.structureLandscapeData,
        get().landscapeData?.dynamicLandscapeData
      );
    },

    restoreClass: (
      app: Application,
      clazz: Class,
      undoCutOperation: boolean = false,
      collabMode: boolean = false
    ) => {
      if (!collabMode) {
        useMessageSenderStore
          .getState()
          .sendRestructureRestoreClassMessage(
            app.id,
            clazz.id,
            undoCutOperation
          );
      }

      set({
        deletedDataModels: get().deletedDataModels.filter((d) => d != clazz),
      });
      const undoMapping = get().meshModelTextureMappings.find(
        (mapping) =>
          mapping.action === RestructureAction.Delete &&
          mapping.meshType === EntityType.Clazz &&
          mapping.app === app &&
          mapping.clazz === clazz
      );
      set({
        meshModelTextureMappings: get().meshModelTextureMappings.filter(
          (m) => m != (undoMapping as MeshModelTextureMapping)
        ),
      });
      if (undoCutOperation) {
        const keyToRemove = 'CUTINSERT|' + clazz.id;

        let newUpdatedClassCommunications = new Map(
          get().updatedClassCommunications
        );
        newUpdatedClassCommunications.delete(keyToRemove);
        set({ updatedClassCommunications: newUpdatedClassCommunications });

        restoreID({ entity: clazz }, 'removed|');
        if (get().createdClassCommunication.length) {
          // TODO: Does this work for updating attributes of comm?
          get().createdClassCommunication.forEach((comm) => {
            // referencing the original app again
            if (!comm.sourceApp) {
              comm.sourceApp = app;
            }
            if (!comm.targetApp) {
              comm.targetApp = app;
            }

            // referencing the original class again
            if (comm.sourceClass.id === clazz.id) {
              comm.sourceClass = clazz;
            }
            if (comm.targetClass.id === clazz.id) {
              comm.targetClass = clazz;
            }
          });
        }
        get().removeMeshModelTextureMapping(
          RestructureAction.CutInsert,
          EntityType.Clazz,
          app,
          clazz.parent,
          clazz
        );
      } else {
        let newCompletelyDeletedClassCommunications = new Map(
          get().completelyDeletedClassCommunications
        );
        newCompletelyDeletedClassCommunications.delete(clazz.id);
        set({
          completelyDeletedClassCommunications:
            newCompletelyDeletedClassCommunications,
        });
      }

      eventEmitter.emit('showChangeLog');
      eventEmitter.emit(
        'restructureLandscapeData',
        get().landscapeData?.structureLandscapeData,
        get().landscapeData?.dynamicLandscapeData
      );
    },

    removeInsertTexture: (element: Package) => {
      let app: Application;
      if (element.parent) {
        app = getApplicationFromSubPackage(
          get().landscapeData?.structureLandscapeData as StructureLandscapeData,
          element.id
        ) as Application;
      } else {
        app = getApplicationFromPackage(
          get().landscapeData?.structureLandscapeData as StructureLandscapeData,
          element.id
        ) as Application;
      }
      get().removeMeshModelTextureMapping(
        RestructureAction.CutInsert,
        EntityType.Package,
        app,
        element
      );
    },

    undoDuplicateApp: (app: Application) => {
      const undoMapping = get().meshModelTextureMappings.find(
        (mapping) =>
          mapping.action === RestructureAction.CopyPaste &&
          mapping.meshType === EntityType.App &&
          mapping.app === app
      );
      set({
        meshModelTextureMappings: get().meshModelTextureMappings.filter(
          (m) => m != (undoMapping as MeshModelTextureMapping)
        ),
      });

      const keyToRemove = 'DUPLICATED|' + app.id;

      let newCopiedClassCommunications = new Map(
        get().copiedClassCommunications
      );
      newCopiedClassCommunications.delete(keyToRemove);
      set({ copiedClassCommunications: newCopiedClassCommunications });
    },

    undoCopyPackage(app: Application, pckg: Package) {
      const undoMapping = get().meshModelTextureMappings.find(
        (mapping) =>
          mapping.action === RestructureAction.CopyPaste &&
          mapping.meshType === EntityType.Package &&
          mapping.app === app &&
          mapping.pckg === pckg
      );

      set({
        meshModelTextureMappings: get().meshModelTextureMappings.filter(
          (m) => m != (undoMapping as MeshModelTextureMapping)
        ),
      });

      const keyToRemove = 'COPIED|' + pckg.id;

      let newCopiedClassCommunications = new Map(
        get().copiedClassCommunications
      );
      newCopiedClassCommunications.delete(keyToRemove);
      set({ copiedClassCommunications: newCopiedClassCommunications });
    },

    //TODO: app gets passed but not used
    undoCopyClass(app: Application, clazz: Class) {
      const keyToRemove = 'DUPLICATED|' + clazz.id;
      const copiedComms = get().copiedClassCommunications.get(keyToRemove);
      if (copiedComms) {
        let newDeletedClassCommunications = [
          ...get().deletedClassCommunications,
        ];
        copiedComms.forEach((comm) => {
          newDeletedClassCommunications.push(comm);
        });
        set({ deletedClassCommunications: newDeletedClassCommunications });

        let newCopiedClassCommunications = new Map(
          get().copiedClassCommunications
        );
        newCopiedClassCommunications.delete(keyToRemove);
        set({ copiedClassCommunications: newCopiedClassCommunications });
      }
    },

    addApplication: (
      appName: string,
      language: string,
      collabMode: boolean = false
    ) => {
      if (get().landscapeData?.structureLandscapeData) {
        if (!collabMode)
          useMessageSenderStore
            .getState()
            .sendRestructureCreateOrDeleteMessage(
              EntityType.App,
              RestructureAction.Create,
              appName,
              language,
              null,
              false
            );

        const foundation = addFoundationToLandscape(
          appName,
          language,
          get().newMeshCounter
        );
        const app = foundation.applications.at(0);
        const pckg = app?.packages.at(0);
        const clazz = pckg?.classes.at(0);
        get().landscapeData!.structureLandscapeData.nodes.push(foundation);

        // Create Changelog Entry
        useChangelogStore
          .getState()
          .createAppEntry(app as Application, pckg as Package, clazz as Class);

        set({
          meshModelTextureMappings: [
            ...get().meshModelTextureMappings,
            {
              action: RestructureAction.Create,
              meshType: EntityType.App,
              texturePath: 'images/plus.png',
              app: app as Application,
              pckg: pckg as Package,
              clazz: clazz as Class,
            },
          ],
        });

        eventEmitter.emit('showChangeLog');
        eventEmitter.emit(
          'restructureLandscapeData',
          get().landscapeData?.structureLandscapeData,
          get().landscapeData?.dynamicLandscapeData
        );
      }
      set({ newMeshCounter: get().newMeshCounter++ });
    },

    applyColorMappings: () => {
      if (get().restructureMode) {
        get().commModelColorMappings.forEach((elem) => {
          const commMesh = get()._getCommMesh(elem);

          commMesh?.changeColor(elem.color);
        });
      }
    },

    _getCommMesh: (elem: CommModelColorMapping) => {
      // Distinguish between internal comms and external comms
      if (elem.comm.sourceApp === elem.comm.targetApp) {
        const appModel = useApplicationRendererStore
          .getState()
          .getApplicationById(elem.comm.sourceApp?.id as string);

        const newCreatedComm = elem.comm.id.includes(' => ');
        if (newCreatedComm) {
          const commMesh = appModel?.commIdToMesh.get(elem.comm.id);
          return commMesh;
        } else {
          // A communication can consist of multiple function calls. The id looks something this: XXX_XXX_operationName
          // The operatioName represents the name of the first function.
          // We need to remove this suffix to get a base ID of the form: XXX_XXX
          const suffixToRemove = '_' + elem.comm.operationName;
          const meshId = elem.comm.id.replace(suffixToRemove, '');

          // Now that we have an Id of the form: XXX_XXX we are only missing the _operationName suffix.
          // We'll look for a key in the 'commIdToMesh' map that starts with our base ID.
          if (appModel) {
            for (const key of appModel.commIdToMesh.keys()) {
              if (key.startsWith(meshId)) {
                return appModel?.commIdToMesh.get(key);
              }
            }
          }

          // Should never happen!

          return undefined;
        }
      } else {
        const commMesh = useLinkRendererStore
          .getState()
          .getLinkById(elem.comm.id);
        return commMesh;
      }
    },

    // TODO: Many redundant cases. Could be refactored/generalized!
    applyTextureMappings: () => {
      if (get().restructureMode) {
        get().meshModelTextureMappings.forEach((elem) => {
          const currentAppModel = useApplicationRendererStore
            .getState()
            .getApplicationById(elem.app?.id as string);
          // Apply Plus texture for new created Meshes
          if (elem.action === RestructureAction.Create) {
            if (elem.meshType === EntityType.App) {
              currentAppModel?.modelIdToMesh.forEach((mesh) => {
                if (mesh instanceof ClazzMesh) {
                  mesh.changeTexture(elem.texturePath); // TODO: Doesn't exist on type ClazzMesh?
                } else {
                  mesh.changeTexture(elem.texturePath);
                }
              });
            } else if (
              elem.meshType === EntityType.Package ||
              elem.meshType === EntityType.SubPackage
            ) {
              currentAppModel?.modelIdToMesh.forEach((mesh) => {
                const isCorrectComponent =
                  mesh instanceof ComponentMesh &&
                  mesh.dataModel.id === elem.pckg?.id;
                const isCorrectClass =
                  mesh instanceof ClazzMesh &&
                  mesh.dataModel.id === elem.clazz?.id;
                if (isCorrectComponent) {
                  mesh.changeTexture(elem.texturePath); // TODO: wrong?
                }
                if (isCorrectClass) {
                  mesh.changeTexture(elem.texturePath); // TODO: Doesn't exist on type ClazzMesh?
                }
              });
            } else if (elem.meshType === EntityType.Clazz) {
              currentAppModel?.modelIdToMesh.forEach((mesh) => {
                const isCorrectClass =
                  mesh instanceof ClazzMesh &&
                  mesh.dataModel.id === elem.clazz?.id; // TODO: Doesn't exist on type ClazzMesh?
                if (isCorrectClass) {
                  mesh.changeTexture(elem.texturePath); // TODO: Doesn't exist on type ClazzMesh?
                }
              });
            }
            // Apply Minus texture for deleted Meshes
          } else if (elem.action === RestructureAction.Delete) {
            if (elem.meshType === EntityType.App) {
              currentAppModel?.modelIdToMesh.forEach((mesh) => {
                mesh.changeTexture(elem.texturePath);
              });
            } else if (
              elem.meshType === EntityType.Package ||
              elem.meshType === EntityType.SubPackage
            ) {
              const allSubPackages = getSubPackagesOfPackage(
                elem.pckg as Package,
                true
              );
              const allClassesInPackage = getClassesInPackage(
                elem.pckg as Package,
                true
              );
              currentAppModel?.modelIdToMesh.forEach((mesh) => {
                const isCorrectComponent =
                  mesh instanceof ComponentMesh &&
                  mesh.dataModel.id === elem.pckg?.id;
                const isCorrectClass =
                  mesh instanceof ClazzMesh &&
                  mesh.dataModel.id === elem.clazz?.id; // TODO: Doesn't exist on type ClazzMesh?
                if (isCorrectComponent || isCorrectClass) {
                  mesh.changeTexture(elem.texturePath); // TODO: Doesn't exist on type ClazzMesh?
                }
              });
              currentAppModel?.modelIdToMesh.forEach((mesh) => {
                allSubPackages.forEach((pckg) => {
                  const isCorrectComponent =
                    mesh instanceof ComponentMesh &&
                    mesh.dataModel.id === pckg.id;
                  if (isCorrectComponent) {
                    mesh.changeTexture(elem.texturePath); // TODO: wrong?
                  }
                });

                allClassesInPackage.forEach((clazz) => {
                  const isCorrectClass =
                    mesh instanceof ClazzMesh && mesh.dataModel.id === clazz.id; // TODO: Doesn't exist on type ClazzMesh?
                  if (isCorrectClass) {
                    mesh.changeTexture(elem.texturePath); // TODO: Doesn't exist on type ClazzMesh?
                  }
                });
              });
            } else if (elem.meshType === EntityType.Clazz) {
              currentAppModel?.modelIdToMesh.forEach((mesh) => {
                const isCorrectClass =
                  mesh instanceof ClazzMesh &&
                  mesh.dataModel.id === elem.clazz?.id; // TODO: Doesn't exist on type ClazzMesh?
                if (isCorrectClass) {
                  mesh.changeTexture(elem.texturePath); // TODO: Doesn't exist on type ClazzMesh?
                }
              });
            }
            // Apply Hashtag texture for renamed operations
          } else if (elem.action === RestructureAction.Rename) {
            if (elem.meshType === EntityType.App) {
              const appliedTexture = get()._findAppliedTexture(elem.app);
              if (!appliedTexture) {
                const foundationMesh = currentAppModel?.modelIdToMesh.get(
                  elem.app.id
                );
                foundationMesh?.changeTexture(elem.texturePath);
              }
            } else if (elem.meshType === EntityType.Package) {
              const appliedTexture = get()._findAppliedTexture(
                elem.pckg as Package,
                RestructureAction.CutInsert
              );

              if (!appliedTexture) {
                const componentMesh = currentAppModel?.modelIdToMesh.get(
                  elem.pckg?.id as string
                );
                componentMesh?.changeTexture(elem.texturePath);
              }
            } else if (elem.meshType === EntityType.Clazz) {
              const appliedTexture = get()._findAppliedTexture(
                elem.clazz as Class,
                RestructureAction.CutInsert
              );
              if (!appliedTexture) {
                const clazzMesh = currentAppModel?.modelIdToMesh.get(
                  elem.clazz?.id as string
                );
                clazzMesh?.changeTexture(elem.texturePath);
              }
            }
            // Apply X texture for copied Meshes
          } else if (elem.action === RestructureAction.CopyPaste) {
            if (elem.meshType === EntityType.App) {
              currentAppModel?.modelIdToMesh.forEach((mesh) => {
                if (mesh instanceof ClazzMesh) {
                  mesh.changeTexture(elem.texturePath); // TODO: Doesn't exist on type ClazzMesh?
                } else {
                  mesh.changeTexture(elem.texturePath);
                }
              });
            } else if (elem.meshType === EntityType.Package) {
              const allSubPackages = getSubPackagesOfPackage(
                elem.pckg as Package,
                true
              );
              const allClassesInPackage = getClassesInPackage(
                elem.pckg as Package,
                true
              );

              const componentMesh = currentAppModel?.modelIdToMesh.get(
                elem.pckg?.id as string
              );

              componentMesh?.changeTexture(elem.texturePath);
              currentAppModel?.modelIdToMesh.forEach((mesh) => {
                allSubPackages.forEach((pckg) => {
                  const isCorrectComponent =
                    mesh instanceof ComponentMesh &&
                    mesh.dataModel.id === pckg.id;
                  if (isCorrectComponent) {
                    mesh.changeTexture(elem.texturePath); // TODO: wrong?
                  }
                });

                allClassesInPackage.forEach((clazz) => {
                  const isCorrectClass =
                    mesh instanceof ClazzMesh && mesh.dataModel.id === clazz.id; // TODO: Doesn't exist on type ClazzMesh?
                  if (isCorrectClass) {
                    mesh.changeTexture(elem.texturePath); // TODO: Doesn't exist on type ClazzMesh?
                  }
                });
              });
            } else if (elem.meshType === EntityType.Clazz) {
              const clazzMesh = currentAppModel?.modelIdToMesh.get(
                elem.clazz?.id as string
              );
              clazzMesh?.changeTexture(elem.texturePath);
            }
            // Apply Slash texture for inserted Meshes
          } else if (elem.action === RestructureAction.CutInsert) {
            if (elem.meshType === EntityType.Package) {
              const appliedTexture = get()._findAppliedTexture(
                elem.pckg as Package
              );
              if (!appliedTexture) {
                const allSubPackages = getSubPackagesOfPackage(
                  elem.pckg as Package,
                  true
                );
                const allClassesInPackage = getClassesInPackage(
                  elem.pckg as Package,
                  true
                );
                const componentMesh = currentAppModel?.modelIdToMesh.get(
                  elem.pckg?.id as string
                );
                componentMesh?.changeTexture(elem.texturePath);
                currentAppModel?.modelIdToMesh.forEach((mesh) => {
                  allSubPackages.forEach((pckg) => {
                    const isCorrectComponent =
                      mesh instanceof ComponentMesh &&
                      mesh.dataModel.id === pckg.id;
                    if (isCorrectComponent) {
                      mesh.changeTexture(elem.texturePath); // TODO: wrong?
                    }
                  });

                  allClassesInPackage.forEach((clazz) => {
                    const isCorrectClass =
                      mesh instanceof ClazzMesh &&
                      mesh.dataModel.id === clazz.id; // TODO: Doesn't exist on type ClazzMesh?
                    if (isCorrectClass) {
                      mesh.changeTexture(elem.texturePath); // TODO: Doesn't exist on type ClazzMesh?
                    }
                  });
                });
              }
            } else if (elem.meshType === EntityType.Clazz) {
              const appliedTexture = get()._findAppliedTexture(
                elem.clazz as Class
              );
              if (!appliedTexture) {
                const clazzMesh = currentAppModel?.modelIdToMesh.get(
                  elem.clazz?.id as string
                );
                clazzMesh?.changeTexture(elem.texturePath);
              }
            }
          }
        });
      }
    },

    _findAppliedTexture: (
      elem: Application | Package | Class,
      action?: RestructureAction
    ) => {
      return get().meshModelTextureMappings.find(
        (entry) =>
          (entry.app === elem || entry.pckg === elem || entry.clazz === elem) &&
          (entry.action === RestructureAction.Create || entry.action === action)
      );
    },

    addCollaborativeSubPackage: (pckgId: string) => {
      const pckg = getPackageById(
        get().landscapeData?.structureLandscapeData as StructureLandscapeData,
        pckgId
      );
      get().addSubPackage(pckg as Package, true);
    },

    addSubPackage: (pckg: Package, collabMode: boolean = false) => {
      if (get().landscapeData?.structureLandscapeData) {
        if (!collabMode)
          useMessageSenderStore
            .getState()
            .sendRestructureCreateOrDeleteMessage(
              EntityType.SubPackage,
              RestructureAction.Create,
              null,
              null,
              pckg.id,
              false
            );

        const app = get().getAppFromPackage(pckg);
        if (app) {
          let subPackage = createPackage(
            'newPackage' + get().newMeshCounter,
            'New Package ' + get().newMeshCounter
          );
          const newClass = createClass(
            'newClass' + get().newMeshCounter,
            'New Class ' + get().newMeshCounter
          );
          newClass.parent = subPackage;
          subPackage.parent = pckg;
          subPackage.classes.push(newClass as Class);
          subPackage = get()._addOriginOfData(subPackage);
          pckg.subPackages.push(subPackage); // TODO: Does this work on the states?


          // Create Changelog Entry
          useChangelogStore
            .getState()
            .createPackageEntry(app, subPackage, newClass as Class);

          set({
            meshModelTextureMappings: [
              ...get().meshModelTextureMappings,
              {
                action: RestructureAction.Create,
                meshType: EntityType.Package,
                texturePath: 'images/plus.png',
                app: app as Application,
                pckg: subPackage as Package,
                clazz: newClass as Class,
              },
            ],
          });

          eventEmitter.emit('showChangeLog');
          eventEmitter.emit(
            'restructureLandscapeData',
            get().landscapeData?.structureLandscapeData,
            get().landscapeData?.dynamicLandscapeData
          );
        }
      }
      set({ newMeshCounter: get().newMeshCounter++ });
    },

    addCollaborativePackage: (appId: string) => {
      const app = getApplicationInLandscapeById(
        get().landscapeData?.structureLandscapeData as StructureLandscapeData,
        appId
      );
      get().addPackage(app as Application, true);
    },

    addPackage: (app: Application, collabMode: boolean = false) => {
      if (get().landscapeData?.structureLandscapeData) {
        if (!collabMode)
          useMessageSenderStore
            .getState()
            .sendRestructureCreateOrDeleteMessage(
              EntityType.Package,
              RestructureAction.Create,
              null,
              null,
              app.id,
              false
            );

        let newPckg = createPackage(
          'newPackage' + get().newMeshCounter,
          'New Package ' + get().newMeshCounter
        );
        const newClass = createClass(
          'newClass' + get().newMeshCounter,
          'New Class ' + get().newMeshCounter
        );
        newClass.parent = newPckg;
        newPckg.classes.push(newClass as Class);
        newPckg = get()._addOriginOfData(newPckg);
        app.packages.push(newPckg); // TODO: Does this work for rerendering?

        // Create Changelog Entry
        useChangelogStore
          .getState()
          .createPackageEntry(app, newPckg, newClass as Class);

        set({
          meshModelTextureMappings: [
            ...get().meshModelTextureMappings,
            {
              action: RestructureAction.Create,
              meshType: EntityType.Package,
              texturePath: 'images/plus.png',
              app: app as Application,
              pckg: newPckg as Package,
              clazz: newClass as Class,
            },
          ],
        });

        eventEmitter.emit('showChangeLog');
        eventEmitter.emit(
          'restructureLandscapeData',
          get().landscapeData?.structureLandscapeData,
          get().landscapeData?.dynamicLandscapeData
        );
      }
      set({ newMeshCounter: get().newMeshCounter++ });
    },

    addCollaborativeClass: (pckgId: string) => {
      const pckg = getPackageById(
        get().landscapeData?.structureLandscapeData as StructureLandscapeData,
        pckgId
      );
      get().addClass(pckg as Package, true);
    },

    addClass: (pckg: Package, collabMode: boolean = false) => {
      if (get().landscapeData?.structureLandscapeData) {
        if (!collabMode)
          useMessageSenderStore
            .getState()
            .sendRestructureCreateOrDeleteMessage(
              EntityType.Clazz,
              RestructureAction.Create,
              null,
              null,
              pckg.id,
              false
            );

        const app = get().getAppFromPackage(pckg);
        if (app) {
          const clazz = createClass(
            'newClass' + get().newMeshCounter,
            'New Class ' + get().newMeshCounter
          );
          clazz.parent = pckg;
          clazz.originOfData = TypeOfAnalysis.Static;
          pckg.classes.push(clazz as Class);

          // Create Changelog Entry
          useChangelogStore.getState().createClassEntry(app, clazz as Class);

          set({
            meshModelTextureMappings: [
              ...get().meshModelTextureMappings,
              {
                action: RestructureAction.Create,
                meshType: EntityType.Clazz,
                texturePath: 'images/plus.png',
                app: app as Application,
                pckg: clazz.parent as Package,
                clazz: clazz as Class,
              },
            ],
          });

          eventEmitter.emit('showChangeLog');
          eventEmitter.emit(
            'restructureLandscapeData',
            get().landscapeData?.structureLandscapeData,
            get().landscapeData?.dynamicLandscapeData
          );
        }
      }
      set({ newMeshCounter: get().newMeshCounter++ });
    },

    deleteCollaborativeApplication: (appId: string, undo: boolean) => {
      const app = getApplicationInLandscapeById(
        get().landscapeData?.structureLandscapeData as StructureLandscapeData,
        appId
      );
      get().deleteApp(app as Application, true, undo);
    },

    deleteApp: (
      app: Application,
      collabMode: boolean = false,
      undo: boolean = false
    ) => {
      if (get().landscapeData?.structureLandscapeData) {
        if (!collabMode)
          useMessageSenderStore
            .getState()
            .sendRestructureCreateOrDeleteMessage(
              EntityType.App,
              RestructureAction.Delete,
              null,
              null,
              app.id,
              undo
            );

        let shouldUndo = undo;
        if (
          !shouldUndo &&
          (app.id.includes('newApp') || app.id.includes('duplicated'))
        ) {
          shouldUndo = true;
        }
        // Create wrapper for Communication, since it can change inside the function
        const wrapper = {
          comms: get().allClassCommunications,
          deletedComms: [],
        };

        if (!shouldUndo) {
          const classesInApplication = getAllClassesInApplication(app);
          removeAffectedCommunications(classesInApplication, wrapper);
          get()._processDeletedAppData(app);

          // Updating deleted communications

          let newCompletelyDeletedClassCommunications = new Map(
            get().completelyDeletedClassCommunications
          );
          newCompletelyDeletedClassCommunications.set(
            app.id,
            wrapper.deletedComms
          );
          set({
            completelyDeletedClassCommunications:
              newCompletelyDeletedClassCommunications,
          });
        } else {
          removeApplication(get().landscapeData!.structureLandscapeData, app);

          // Removes the duplicate texture and comms
          if (app.id.includes('duplicated')) get().undoDuplicateApp(app);

          // Removes existing Changelog entry
          useChangelogStore.getState().deleteAppEntry(app, true);

          // Remove all meshes of the application
          const appObject3D: ApplicationObject3D | undefined =
            useApplicationRendererStore.getState().getApplicationById(app.id);
          if (appObject3D) {
            appObject3D.removeAll();
            appObject3D.removeAllCommunication();
          }
        }

        eventEmitter.emit('showChangeLog');
        eventEmitter.emit(
          'restructureLandscapeData',
          get().landscapeData?.structureLandscapeData,
          get().landscapeData?.dynamicLandscapeData
        );
      }
    },

    _processDeletedAppData: (app: Application) => {
      // Create Changelog Entry
      useChangelogStore.getState().deleteAppEntry(app);

      // Store all datamodels that are deleted
      get().storeDeletedAppData(app);

      set({
        meshModelTextureMappings: [
          ...get().meshModelTextureMappings,
          {
            action: RestructureAction.Delete,
            meshType: EntityType.App,
            texturePath: 'images/minus.png',
            app: app,
          },
        ],
      });
    },

    deleteCollaborativePackage: (pckgId: string, undo: boolean) => {
      const pckg = getPackageById(
        get().landscapeData?.structureLandscapeData as StructureLandscapeData,
        pckgId
      );
      get().deletePackage(pckg as Package, true, undo);
    },

    deletePackage: (
      pckg: Package,
      collabMode: boolean = false,
      undo: boolean = false
    ) => {
      if (get().landscapeData?.structureLandscapeData) {
        if (!collabMode)
          useMessageSenderStore
            .getState()
            .sendRestructureCreateOrDeleteMessage(
              EntityType.Package,
              RestructureAction.Delete,
              null,
              null,
              pckg.id,
              undo
            );

        const app = get().getApp(pckg) as Application;

        let shouldUndo = undo;

        if (
          (!shouldUndo && pckg.id.includes('newPackage')) ||
          pckg.id.includes('copied')
        ) {
          shouldUndo = true;
        }

        // Create wrapper for Communication and the Mesh to delete, since it can change inside the function
        const wrapper = {
          comms: get().allClassCommunications,
          deletedComms: [],
        };

        if (!shouldUndo) {
          const classesInPackge = getClassesInPackage(pckg);
          removeAffectedCommunications(classesInPackge, wrapper);

          let newCompletelyDeletedClassCommunications = new Map(
            get().completelyDeletedClassCommunications
          );
          newCompletelyDeletedClassCommunications.set(
            pckg.id,
            wrapper.deletedComms
          );
          set({
            completelyDeletedClassCommunications:
              newCompletelyDeletedClassCommunications,
          });

          // Create Changelog Entry
          if (app && pckg.parent) {
            useChangelogStore
              .getState()
              .deleteSubPackageEntry(app, pckg, false); // TODO: undoInsert was missing
          } else if (app && !pckg.parent) {
            useChangelogStore.getState().deletePackageEntry(app, pckg, false); // TODO: undoInsert was missing
          }

          get().storeDeletedPackageData(pckg);

          set({
            meshModelTextureMappings: [
              ...get().meshModelTextureMappings,
              {
                action: RestructureAction.Delete,
                meshType: EntityType.Package,
                texturePath: 'images/minus.png',
                app: app as Application,
                pckg: pckg,
              },
            ],
          });
        } else {
          if (!canDeletePackage(pckg, app as Application)) {
            useToastHandlerStore
              .getState()
              .showErrorToastMessage('Package cannot be removed');
            return;
          }
          removePackageFromApplication(pckg, app as Application);

          // Only necessary, when we delete a copy
          if (pckg.id.includes('copied')) get().undoCopyPackage(app, pckg);

          // Removes existing Changelog Entry
          if (pckg.parent) {
            useChangelogStore
              .getState()
              .deleteSubPackageEntry(app as Application, pckg, true);
          } else {
            useChangelogStore
              .getState()
              .deletePackageEntry(app as Application, pckg, true);
          }
        }

        eventEmitter.emit('showChangeLog');
        eventEmitter.emit(
          'restructureLandscapeData',
          get().landscapeData?.structureLandscapeData,
          get().landscapeData?.dynamicLandscapeData
        );
      }
    },

    /**
     * Stores all data models associated with a deleted application. These data models are added to the `deletedDataModels` array
     * for potential future restoration.
     *
     * @param app The application that has been deleted.
     */
    storeDeletedAppData: (app: Application) => {
      const allPackages = getAllPackagesInApplication(app);
      const allClasses = getAllClassesInApplication(app);
      set({ deletedDataModels: [...get().deletedDataModels, app] });
      allPackages.forEach((pckg) => {
        set({ deletedDataModels: [...get().deletedDataModels, pckg] });
      });
      allClasses.forEach((clazz) => {
        set({ deletedDataModels: [...get().deletedDataModels, clazz] });
      });
    },

    /**
     * Restores the data models of a deleted application. It searches the `deletedDataModels`
     * array for the application, its associated packages, and classes, and then removes them from the
     * `deletedDataModels` array, effectively restoring them to their inital state.
     *
     * @param app The application that is going to be restored.
     */
    restoreDeletedAppData: (app: Application) => {
      set({
        deletedDataModels: [...get().deletedDataModels.filter((d) => d != app)],
      });
      const allPackages = getAllPackagesInApplication(app);
      const allClasses = getAllClassesInApplication(app);
      allPackages.forEach((pckg) => {
        set({
          deletedDataModels: get().deletedDataModels.filter((d) => d != pckg),
        });
      });
      allClasses.forEach((clazz) => {
        set({
          deletedDataModels: get().deletedDataModels.filter((d) => d != clazz),
        });
      });
    },

    /**
     * Stores all data models associated with a deleted package. These data models are added to the `deletedDataModels`
     * array for potential future restoration.
     *
     * @param pckg The package that has been deleted or is intended to be deleted.
     */
    storeDeletedPackageData: (pckg: Package) => {
      const allPackages = getSubPackagesOfPackage(pckg, true);
      const allClasses = getClassesInPackage(pckg, true);
      set({ deletedDataModels: [...get().deletedDataModels, pckg] });
      allPackages.forEach((pckg) => {
        set({ deletedDataModels: [...get().deletedDataModels, pckg] });
      });
      allClasses.forEach((clazz) => {
        set({ deletedDataModels: [...get().deletedDataModels, clazz] });
      });
    },

    /**
     * Restores the data models of a deleted package. It searches the `deletedDataModels`
     * array for the package, its associated subpackages, and classes, and then removes them from the
     * `deletedDataModels` array, effectively restoring them to their inital state.
     *
     * @param pckg The package that is going to be restored.
     */
    restoreDeletedPackageData(pckg: Package) {
      set({
        deletedDataModels: [
          ...get().deletedDataModels.filter((d) => d != pckg),
        ],
      });
      const allPackages = getSubPackagesOfPackage(pckg, true);
      const allClasses = getClassesInPackage(pckg, true);
      allPackages.forEach((pckg) => {
        set({
          deletedDataModels: get().deletedDataModels.filter((d) => d != pckg),
        });
      });
      allClasses.forEach((clazz) => {
        set({
          deletedDataModels: get().deletedDataModels.filter((d) => d != clazz),
        });
      });
    },

    deleteCollaborativeClass: (clazzId: string, undo: boolean) => {
      const clazz = getClassById(
        get().landscapeData?.structureLandscapeData as StructureLandscapeData,
        clazzId
      );
      get().deleteClass(clazz as Class, true, undo);
    },

    deleteClass: (
      clazz: Class,
      collabMode: boolean = false,
      undo: boolean = false
    ) => {
      if (get().landscapeData?.structureLandscapeData) {
        if (!collabMode)
          useMessageSenderStore
            .getState()
            .sendRestructureCreateOrDeleteMessage(
              EntityType.Clazz,
              RestructureAction.Delete,
              null,
              null,
              clazz.id,
              undo
            );

        const application = getApplicationFromClass(
          get().landscapeData!.structureLandscapeData,
          clazz
        );

        let shouldUndo = undo;

        if (
          !shouldUndo &&
          (clazz.id.includes('newClass') || clazz.id.includes('copied'))
        ) {
          shouldUndo = true;
        }

        // Create wrapper for Communication and the Mesh to delete, since it can change inside the function
        const wrapper = {
          comms: get().allClassCommunications,
          deletedComms: [],
        };

        if (!shouldUndo) {
          removeAffectedCommunications([clazz], wrapper);

          let newCompletelyDeletedClassCommunications = new Map(
            get().completelyDeletedClassCommunications
          );
          newCompletelyDeletedClassCommunications.set(
            clazz.id,
            wrapper.deletedComms
          );
          set({
            completelyDeletedClassCommunications:
              newCompletelyDeletedClassCommunications,
          });

          set({
            meshModelTextureMappings: [
              ...get().meshModelTextureMappings,
              {
                action: RestructureAction.Delete,
                meshType: EntityType.Clazz,
                texturePath: 'images/minus.png',
                app: application as Application,
                clazz: clazz,
              },
            ],
          });

          // Create Changelog Entry
          useChangelogStore
            .getState()
            .deleteClassEntry(application as Application, clazz, false);

          set({ deletedDataModels: [...get().deletedDataModels, clazz] });
        } else {
          if (!canDeleteClass(clazz)) {
            useToastHandlerStore
              .getState()
              .showErrorToastMessage('Class cannot be removed');
            return;
          }

          removeClassFromPackage(clazz);

          if (clazz.id.includes('copied'))
            get().undoCopyClass(application as Application, clazz);

          // Removing existing Create Entry
          useChangelogStore
            .getState()
            .deleteClassEntry(application as Application, clazz, true);
        }

        eventEmitter.emit('showChangeLog');
        eventEmitter.emit(
          'restructureLandscapeData',
          get().landscapeData?.structureLandscapeData,
          get().landscapeData?.dynamicLandscapeData
        );
      }
    },

    cutPackage(pckg: Package) {
      set({ clipboard: pckg.name });
      set({ clippedMesh: pckg });
    },

    cutClass(clazz: Class) {
      set({ clipboard: clazz.name });
      set({ clippedMesh: clazz });
    },

    resetClipboard() {
      set({ clipboard: '' });
      set({ clippedMesh: null });
    },

    pasteCollaborativePackage: (
      destinationEntity: string,
      destinationId: string,
      clippedEntityId: string
    ) => {
      set({
        clippedMesh: getPackageById(
          get().landscapeData?.structureLandscapeData as StructureLandscapeData,
          clippedEntityId
        ) as Package,
      });

      if (destinationEntity === 'APP') {
        const app = getApplicationInLandscapeById(
          get().landscapeData?.structureLandscapeData as StructureLandscapeData,
          destinationId
        );
        get().pastePackage(app as Application, true);
      } else {
        const pckg = getPackageById(
          get().landscapeData?.structureLandscapeData as StructureLandscapeData,
          destinationId
        );
        get().pastePackage(pckg as Package, true);
      }
    },

    pasteCollaborativeClass: (
      destinationId: string,
      clippedEntityId: string
    ) => {
      set({
        clippedMesh: getClassById(
          get().landscapeData?.structureLandscapeData as StructureLandscapeData,
          clippedEntityId
        ) as Class,
      });

      const pckg = getPackageById(
        get().landscapeData?.structureLandscapeData as StructureLandscapeData,
        destinationId
      );
      get().pasteClass(pckg as Package, true);
    },

    insertCollaborativePackagerOrClass: (
      destinationEntity: string,
      destinationId: string,
      clippedEntity: string,
      clippedEntityId: string
    ) => {
      if (clippedEntity === 'PACKAGE') {
        set({
          clippedMesh: getPackageById(
            get().landscapeData
              ?.structureLandscapeData as StructureLandscapeData,
            clippedEntityId
          ) as Package,
        });
      } else {
        set({
          clippedMesh: getClassById(
            get().landscapeData
              ?.structureLandscapeData as StructureLandscapeData,
            clippedEntityId
          ) as Class,
        });
      }

      if (destinationEntity === 'APP') {
        const app = getApplicationInLandscapeById(
          get().landscapeData?.structureLandscapeData as StructureLandscapeData,
          destinationId
        );
        get().movePackageOrClass(app as Application, true);
      } else {
        const pckg = getPackageById(
          get().landscapeData?.structureLandscapeData as StructureLandscapeData,
          destinationId
        );
        get().movePackageOrClass(pckg as Package, true);
      }
    },

    getApp(appChild: Package | Class) {
      const landscapeData = get().landscapeData
        ?.structureLandscapeData as StructureLandscapeData;
      if (isPackage(appChild)) {
        if (appChild.parent)
          return getApplicationFromSubPackage(landscapeData, appChild.id);
        else return getApplicationFromPackage(landscapeData, appChild.id);
      }

      if (isClass(appChild))
        return getApplicationFromClass(landscapeData, appChild);

      return undefined;
    },

    pastePackage: (
      destination: Application | Package,
      collabMode: boolean = false
    ) => {
      if (get().landscapeData?.structureLandscapeData) {
        if (!collabMode) {
          if (isApplication(destination)) {
            useMessageSenderStore
              .getState()
              .sendRestructureCopyAndPastePackageMessage(
                EntityType.App,
                destination.id,
                get().clippedMesh?.id as string
              );
          } else if (isPackage(destination)) {
            useMessageSenderStore
              .getState()
              .sendRestructureCopyAndPastePackageMessage(
                EntityType.Package,
                destination.id,
                get().clippedMesh?.id as string
              );
          }
        }
        const app = get().getApp(get().clippedMesh as Package) as Application;

        const copiedClassCommunications: ClassCommunication[] = [];

        const wrapper = {
          idCounter: get().newMeshCounter,
          comms: get().allClassCommunications,
          copiedComms: copiedClassCommunications,
        };

        // Copy the clipped package
        const copiedPackage = copyPackageContent(get().clippedMesh as Package);
        if (isPackage(destination)) copiedPackage.parent = destination; // TODO: Does this work?

        const meshTextureMapping: Partial<MeshModelTextureMapping> = {
          action: RestructureAction.CopyPaste,
          texturePath: 'images/x.png',
          meshType: EntityType.Package,
          pckg: copiedPackage,
        };

        pastePackage(
          get().landscapeData!.structureLandscapeData,
          copiedPackage,
          destination,
          wrapper
        );

        changeID(
          get().landscapeData!.structureLandscapeData,
          { entity: copiedPackage },
          'copied' + get().newMeshCounter + '|'
        );

        set({ newMeshCounter: get().newMeshCounter++ });

        if (get().clippedMesh?.parent) {
          useChangelogStore
            .getState()
            .copySubPackageEntry(
              app,
              copiedPackage,
              destination,
              get().clippedMesh as Package,
              get().landscapeData!.structureLandscapeData
            );
        } else {
          useChangelogStore
            .getState()
            .copyPackageEntry(
              app,
              copiedPackage,
              destination,
              get().clippedMesh as Package,
              get().landscapeData!.structureLandscapeData
            );
        }

        if (isApplication(destination)) {
          meshTextureMapping.app = destination;
          set({
            meshModelTextureMappings: [
              ...get().meshModelTextureMappings,
              meshTextureMapping as MeshModelTextureMapping,
            ],
          });
        } else if (isPackage(destination)) {
          const destinationApp = get().getApp(destination);
          meshTextureMapping.app = destinationApp;
          set({
            meshModelTextureMappings: [
              ...get().meshModelTextureMappings,
              meshTextureMapping as MeshModelTextureMapping,
            ],
          });
        }

        const key = 'COPIED|' + copiedPackage.id;

        let newCopiedClassCommunications = new Map(
          get().copiedClassCommunications
        );
        newCopiedClassCommunications.set(key, wrapper.copiedComms);
        set({ copiedClassCommunications: newCopiedClassCommunications });

        eventEmitter.emit('showChangeLog');
        eventEmitter.emit(
          'restructureLandscapeData',
          get().landscapeData?.structureLandscapeData,
          get().landscapeData?.dynamicLandscapeData
        );
      }
    },

    pasteClass: (destination: Package, collabMode: boolean = false) => {
      if (get().landscapeData?.structureLandscapeData) {
        if (!collabMode) {
          useMessageSenderStore
            .getState()
            .sendRestructureCopyAndPasteClassMessage(
              destination.id,
              get().clippedMesh?.id as string
            );
        }
        const app = get().getApp(get().clippedMesh as Class) as Application;

        const copiedClassCommunications: ClassCommunication[] = [];

        const wrapper = {
          idCounter: get().newMeshCounter,
          comms: get().allClassCommunications,
          copiedComms: copiedClassCommunications,
        };

        // Copy the clipped class
        const copiedClass = copyClassContent(get().clippedMesh as Class);
        copiedClass.parent = destination; // TODO: Does this work?

        const meshTextureMapping: Partial<MeshModelTextureMapping> = {
          action: RestructureAction.CopyPaste,
          texturePath: 'images/x.png',
          meshType: EntityType.Clazz,
          clazz: copiedClass,
        };

        pasteClass(
          get().landscapeData!.structureLandscapeData,
          copiedClass,
          destination,
          wrapper
        );

        changeID(
          get().landscapeData!.structureLandscapeData,
          { entity: copiedClass },
          'copied' + get().newMeshCounter + '|'
        );

        set({ newMeshCounter: get().newMeshCounter++ });

        useChangelogStore
          .getState()
          .copyClassEntry(
            app,
            copiedClass,
            destination,
            get().clippedMesh as Class,
            get().landscapeData!.structureLandscapeData
          );

        const destinationApp = get().getApp(destination);
        meshTextureMapping.app = destinationApp; // TODO: Does this work?
        set({
          meshModelTextureMappings: [
            ...get().meshModelTextureMappings,
            meshTextureMapping as MeshModelTextureMapping,
          ],
        });

        const key = 'COPIED|' + copiedClass.id;

        let newCopiedClassCommunications = new Map(
          get().copiedClassCommunications
        );
        newCopiedClassCommunications.set(key, wrapper.copiedComms);
        set({ copiedClassCommunications: newCopiedClassCommunications });

        eventEmitter.emit('showChangeLog');
        eventEmitter.emit(
          'restructureLandscapeData',
          get().landscapeData?.structureLandscapeData,
          get().landscapeData?.dynamicLandscapeData
        );
      }
    },

    // INFO: originOfData had to be added for packages and classes
    //       to fix crashing on adding or pasting packages/classes
    _addOriginOfData: (entity: Package) => {
      let newEntity = {...entity};

      if (newEntity.originOfData === undefined) {
        newEntity.originOfData = TypeOfAnalysis.Static;
      }

      let clazzes = newEntity.classes;
      clazzes.forEach((clazz) => {
        if (clazz.originOfData === undefined) {
          clazz.originOfData = TypeOfAnalysis.Static;
        }
      });
      newEntity.classes = clazzes;

      let subpackages: Package[] = [];
      newEntity.subPackages.forEach((sp) => {
        const subpackage = get()._addOriginOfData(sp);
        subpackages.push(subpackage);
      });
      newEntity.subPackages = subpackages;

      return newEntity;
    },

    movePackageOrClass: (
      destination: Application | Package,
      collabMode: boolean = false
    ) => {
      if (get().landscapeData?.structureLandscapeData) {
        if (!collabMode) {
          get()._sendCutInsertMessage(destination);
        }

        const app = get().getApp(get().clippedMesh as Package | Class);

        const updatedClassCommunications: ClassCommunication[] = [];

        // Create wrapper for Communication and the Mesh to delete, since it can change inside the function
        const wrapper = {
          comms: get().allClassCommunications,
          meshTodelete: get().clippedMesh as Package,
          updatedComms: updatedClassCommunications,
        };

        const meshTextureMapping: Partial<MeshModelTextureMapping> = {
          action: RestructureAction.CutInsert,
          texturePath: '/images/slash.png',
        };

        // Distinguish between clipped Package and clipped Class
        if (isPackage(get().clippedMesh)) {
          // Copy the clipped package
          let cuttedPackage = copyPackageContent(
            get().clippedMesh as Package
          );
          cuttedPackage.parent = get().clippedMesh!.parent;

          cuttedPackage = get()._addOriginOfData(cuttedPackage);

          // Set the texture to correct mesh
          meshTextureMapping.meshType = EntityType.Package;
          meshTextureMapping.pckg = cuttedPackage;

          movePackage(
            get().landscapeData!.structureLandscapeData,
            cuttedPackage,
            destination,
            wrapper
          );

          // Create Changelog Entry
          if (get().clippedMesh!.parent && app) {
            useChangelogStore
              .getState()
              .moveSubPackageEntry(
                app,
                cuttedPackage,
                destination,
                wrapper.meshTodelete,
                get().landscapeData!.structureLandscapeData
              );
          } else if (!get().clippedMesh!.parent && app) {
            useChangelogStore
              .getState()
              .movePackageEntry(
                app,
                cuttedPackage,
                destination,
                wrapper.meshTodelete,
                get().landscapeData!.structureLandscapeData
              );
          }

          changeID(
            get().landscapeData!.structureLandscapeData,
            { entity: get().clippedMesh! },
            'removed|'
          );

          set({
            meshModelTextureMappings: [
              ...get().meshModelTextureMappings,
              {
                action: RestructureAction.Delete,
                meshType: EntityType.Package,
                texturePath: 'images/minus.png',
                app: app as Application,
                pckg: get().clippedMesh as Package,
              },
            ],
          });
          get().storeDeletedPackageData(get().clippedMesh as Package);
        } else if (isClass(get().clippedMesh) && app) {
          // Copy the clipped class
          const cuttedClass = copyClassContent(get().clippedMesh as Class);
          cuttedClass.parent = get().clippedMesh!.parent; // TODO: Does this work?

          // Set the texture to correct mesh
          meshTextureMapping.meshType = EntityType.Clazz;
          meshTextureMapping.clazz = cuttedClass;

          moveClass(
            get().landscapeData!.structureLandscapeData,
            cuttedClass,
            destination as Package,
            wrapper
          );

          // Create Changelog Entry
          useChangelogStore
            .getState()
            .moveClassEntry(
              app,
              cuttedClass,
              destination as Package,
              get().clippedMesh!,
              get().landscapeData!.structureLandscapeData
            );

          changeID(
            get().landscapeData!.structureLandscapeData,
            { entity: get().clippedMesh! },
            'removed|'
          );

          set({
            meshModelTextureMappings: [
              ...get().meshModelTextureMappings,
              {
                action: RestructureAction.Delete,
                meshType: EntityType.Clazz,
                texturePath: 'images/minus.png',
                app: app as Application,
                pckg: get().clippedMesh!.parent,
                clazz: get().clippedMesh as Class,
              },
            ],
          });

          set({
            deletedDataModels: [
              ...get().deletedDataModels,
              get().clippedMesh as Class,
            ],
          });
        }

        // const key = this.changeLog.changeLogEntries.at(-1)?.id;
        const key = 'CUTINSERT|' + get().clippedMesh?.id;

        let newUpdatedClassCommunications = new Map(
          get().updatedClassCommunications
        );
        newUpdatedClassCommunications.set(key, wrapper.updatedComms);
        set({ updatedClassCommunications: newUpdatedClassCommunications });

        get().resetClipboard();

        if (isApplication(destination)) {
          meshTextureMapping.app = destination;
          set({
            meshModelTextureMappings: [
              ...get().meshModelTextureMappings,
              meshTextureMapping as MeshModelTextureMapping,
            ],
          });
        } else if (isPackage(destination)) {
          const destinationApp = get().getApp(destination);
          meshTextureMapping.app = destinationApp;
          set({
            meshModelTextureMappings: [
              ...get().meshModelTextureMappings,
              meshTextureMapping as MeshModelTextureMapping,
            ],
          });
        }

        eventEmitter.emit('showChangeLog');
        eventEmitter.emit(
          'restructureLandscapeData',
          get().landscapeData?.structureLandscapeData,
          get().landscapeData?.dynamicLandscapeData
        );
      }
    },

    undoBundledEntries: (bundledCreateEntries: BaseChangeLogEntry[]) => {
      const entry = bundledCreateEntries.at(0);
      if (entry instanceof AppChangeLogEntry) {
        const { app } = entry;

        get().deleteApp(app as Application, false, true);
      } else if (
        entry instanceof PackageChangeLogEntry ||
        entry instanceof SubPackageChangeLogEntry
      ) {
        const { pckg } = entry;

        get().deletePackage(pckg as Package, false, true);
      }
      useChangelogStore.getState().removeEntries(bundledCreateEntries);
    },

    undoEntry: (entry: BaseChangeLogEntry) => {
      if (entry.action === RestructureAction.Create) {
        if (entry instanceof AppChangeLogEntry) {
          const { app } = entry;
          get().deleteApp(app as Application, false, true);
        } else if (entry instanceof ClassChangeLogEntry) {
          const { clazz } = entry;
          get().deleteClass(clazz as Class, false, true);
        } else if (
          entry instanceof PackageChangeLogEntry ||
          entry instanceof SubPackageChangeLogEntry
        ) {
          const { pckg } = entry;
          get().deletePackage(pckg as Package, false, true);
        } else if (entry instanceof CommunicationChangeLogEntry) {
          const { communication } = entry;
          get().deleteCommunication(
            communication as ClassCommunication,
            true,
            false
          );
        }
      }

      if (entry.action === RestructureAction.Rename) {
        if (entry instanceof AppChangeLogEntry) {
          const { app, originalAppName } = entry;
          get().renameApplication(
            originalAppName as string,
            app?.id as string,
            false,
            true
          );
        } else if (entry instanceof PackageChangeLogEntry) {
          const { pckg, originalPckgName } = entry;
          get().renamePackage(
            originalPckgName as string,
            pckg?.id as string,
            false,
            true
          );
        } else if (entry instanceof SubPackageChangeLogEntry) {
          const { pckg, originalPckgName } = entry;
          get().renameSubPackage(
            originalPckgName as string,
            pckg?.id as string,
            false,
            true
          );
        } else if (entry instanceof ClassChangeLogEntry) {
          const { app, clazz, originalClazzName } = entry;
          get().renameClass(
            originalClazzName as string,
            clazz?.id as string,
            app?.id as string,
            false,
            true
          );
        } else if (entry instanceof CommunicationChangeLogEntry) {
          const { communication, originalOperationName } = entry;
          get().renameOperation(
            communication as ClassCommunication,
            originalOperationName as string,
            false,
            true
          );
        }
      }

      if (entry.action === RestructureAction.Delete) {
        if (entry instanceof AppChangeLogEntry) {
          const { app } = entry;
          useChangelogStore.getState().restoreDeletedEntries(app?.id as string);
          get().restoreApplication(app as Application, true, false);
          return;
        } else if (
          entry instanceof PackageChangeLogEntry ||
          entry instanceof SubPackageChangeLogEntry
        ) {
          const { pckg } = entry;
          useChangelogStore.getState().restoreDeletedEntries(pckg.id as string);
          get().restorePackage(pckg as Package, true, false);
        } else if (entry instanceof ClassChangeLogEntry) {
          const { app, clazz } = entry;
          useChangelogStore
            .getState()
            .restoreDeletedEntries(clazz.id as string);
          get().restoreClass(app as Application, clazz as Class, true, false);
        } else if (entry instanceof CommunicationChangeLogEntry) {
          const { communication } = entry;
          useChangelogStore
            .getState()
            .restoreDeletedEntries(communication.id as string);
          get().deleteCommunication(
            communication as ClassCommunication,
            true,
            false
          );
        }

        useChangelogStore.getState().removeEntry(entry);
      }

      if (entry.action === RestructureAction.CopyPaste) {
        if (entry instanceof AppChangeLogEntry) {
          const { app } = entry;
          get().deleteApp(app as Application, false, true);
        } else if (
          entry instanceof PackageChangeLogEntry ||
          entry instanceof SubPackageChangeLogEntry
        ) {
          const { pckg } = entry;

          get().deletePackage(pckg as Package, false, true);
        } else if (entry instanceof ClassChangeLogEntry) {
          const { clazz } = entry;
          get().deleteClass(clazz, false, true);
        }
      }

      if (entry.action === RestructureAction.CutInsert) {
        if (
          entry instanceof PackageChangeLogEntry ||
          entry instanceof SubPackageChangeLogEntry
        ) {
          const { original, pckg } = entry;
          get().deletePackage(pckg as Package, false, true);
          if (isApplication(original)) {
            get().restoreApplication(original, true, false);
          } else if (isPackage(original)) {
            get().restorePackage(original, true, false);
          }
          //this.removeInsertTexture(pckg as Package);
        } else if (entry instanceof ClassChangeLogEntry) {
          const { original, clazz } = entry;

          // TODO Not working correctly if we created communications. Need to update the affected and created communication (set the source/target class back)
          get().deleteClass(clazz as Class, false, true);
          if (isApplication(original)) {
            get().restoreApplication(original, true, false);
          } else if (isPackage(original)) {
            get().restorePackage(original, true, false);
          } else if (isClass(original)) {
            const originApp = getApplicationFromClass(
              get().landscapeData
                ?.structureLandscapeData as StructureLandscapeData,
              original
            );
            get().restoreClass(
              originApp as Application,
              original as Class,
              true,
              false
            );
          }
        }
      }

      useChangelogStore.getState().removeEntry(entry);
      eventEmitter.emit('showChangeLog');
    },

    removeMeshModelTextureMapping: (
      action: RestructureAction,
      entityType: EntityType,
      app: Application,
      pckg?: Package,
      clazz?: Class
    ) => {
      const undoMapping = get().meshModelTextureMappings.find(
        (mapping) =>
          mapping.action === action &&
          mapping.meshType === entityType &&
          mapping.app.id === app.id &&
          mapping.pckg?.id === pckg?.id &&
          mapping.clazz?.id === clazz?.id
      );
      set({
        meshModelTextureMappings: get().meshModelTextureMappings.filter(
          (m) => m != (undoMapping as MeshModelTextureMapping)
        ),
      });
    },

    _sendCutInsertMessage: (destination: Application | Package) => {
      if (isApplication(destination)) {
        if (isPackage(get().clippedMesh))
          useMessageSenderStore
            .getState()
            .sendRestructureCutAndInsertMessage(
              EntityType.App,
              destination.id,
              EntityType.Package,
              get().clippedMesh?.id as string
            );
        else
          useMessageSenderStore
            .getState()
            .sendRestructureCutAndInsertMessage(
              EntityType.App,
              destination.id,
              EntityType.Clazz,
              get().clippedMesh?.id as string
            );
      } else {
        if (isPackage(get().clippedMesh))
          useMessageSenderStore
            .getState()
            .sendRestructureCutAndInsertMessage(
              EntityType.Package,
              destination.id,
              EntityType.Package,
              get().clippedMesh?.id as string
            );
        else
          useMessageSenderStore
            .getState()
            .sendRestructureCutAndInsertMessage(
              EntityType.Package,
              destination.id,
              EntityType.Clazz,
              get().clippedMesh?.id as string
            );
      }
    },

    setCanvas: (canvas) => set({ canvas: canvas }),

    setAllClassCommunications: (allClassCommunications) =>
      set({ allClassCommunications: allClassCommunications }),
  })
);

function removeCopiedClassCommunication(key: string) {
  useLandscapeRestructureStore.setState((prev) => {
    const updatedMap = new Map(prev.copiedClassCommunications);
    updatedMap.delete(key);
    return {
      copiedClassCommunications: updatedMap,
    };
  });
}
