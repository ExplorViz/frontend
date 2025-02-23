import { create } from 'zustand';
import { LandscapeData } from 'react-lib/src/utils/landscape-schemes/landscape-data';
import {
  Application,
  Class,
  Package,
  isApplication,
  isClass,
  isPackage,
  StructureLandscapeData,
} from 'react-lib/src/utils/landscape-schemes/structure-data';
import {
  RestructureAction,
  EntityType,
} from 'react-lib/src/utils/restructure-helper';
import ClassCommunication from 'react-lib/src/utils/landscape-schemes/dynamic/class-communication';
import { getClassById } from 'react-lib/src/utils/class-helpers';
import {
  getApplicationFromClass,
  getApplicationFromPackage,
  getApplicationFromSubPackage,
  getApplicationInLandscapeById,
} from 'react-lib/src/utils/landscape-structure-helpers';
import {
  getAllClassesInApplication,
  getAllPackagesInApplication,
} from 'react-lib/src/utils/application-helpers';
import {
  getClassesInPackage,
  getPackageById,
  getSubPackagesOfPackage,
} from 'react-lib/src/utils/package-helpers';
import { BaseChangeLogEntry } from '../utils/changelog-entry';

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
  restructureMode: boolean;
  landscapeData: LandscapeData | null;
  newMeshCounter: number;
  meshModelTextureMappings: MeshModelTextureMapping[];
  commModelColorMappings: CommModelColorMapping[];
  deletedDataModels: diverseDataModel[];
  canvas?: HTMLCanvasElement;
  clipboard: string;
  clippedMesh: Package | Class | null;
  createdClassCommunication: ClassCommunication[];
  allClassCommunications: ClassCommunication[];
  copiedClassCommunications: Map<string, ClassCommunication[]>;
  removeCopiedClassCommunication: (key: string) => void;
  updatedClassCommunications: Map<string, ClassCommunication[]>;
  completelyDeletedClassCommunications: Map<string, ClassCommunication[]>;
  deletedClassCommunications: ClassCommunication[];
  sourceClass: Class | null;
  targetClass: Class | null;
  resetLandscapeRestructure: () => void;
  setSourceOrTargetClass: (type: string) => void;
  setCommunicationSourceClass: (clazz: Class) => void;
  setCommunicationTargetClass: (clazz: Class) => void;
  addCollaborativeCommunication: (
    sourceClassId: string,
    targetClassId: string,
    methodName: string
  ) => void;
  addCommunication: (methodName: string, collabMode: boolean) => void;
  setLandscapeData: (newData: LandscapeData | null) => void;
  getAppFromPackage: (pckg: Package) => Application | undefined;
  removeInsertTexture: (element: Package) => void;
  undoDuplicateApp: (app: Application) => void;
  undoCopyPackage: (app: Application, pckg: Package) => void;
  undoCopyClass: (app: Application, clazz: Class) => void;
  findAppliedTexture: (
    elem: Application | Package | Class,
    action?: RestructureAction
  ) => MeshModelTextureMapping | undefined;
  storeDeletedAppData: (app: Application) => void;
  restoreDeletedAppData: (app: Application) => void;
  storeDeletedPackageData: (pckg: Package) => void;
  restoreDeletedPackageData: (pckg: Package) => void;
  // deleteCollaborativeClass: (clazzId: string, undo: boolean) => void;
  // deletClass:(clazz: Class, collabMode: boolean, undo: boolean) => void;
  cutPackage: (pckg: Package) => void;
  cutClass: (clazz: Class) => void;
  resetClipboard: () => void;
  // pasteCollaborativePackage:(destinationEntity: string, destinationId: string, clippedEntityId: string) => void;
  // pasteCollaborativeClass: (destinationId: string, clippedEntityId: string) => void;
  // insertCollaborativePackagerOrClass:(detinationEntity: string, destinationId: string, clippedEntity:string, clippedEntityId: string) => void;
  getApp(appChild: Package | Class): Application | undefined;
  // pastePackage: (destination: Application | Package, collabMode: boolean) => void;
  // pasteClass: (destination: Package, collabMode: boolean) => void;
  // movePackageOrClass(destination: Application | Package, collabMode: boolean): void;
  // undoBundledEntries(bundledCreateEntries: BaseChangeLogEntry[]): void;
  // undoEntry: (entry: BaseChangeLogEntry) => void;
  removeMeshModelTextureMapping: (
    action: RestructureAction,
    entityType: EntityType,
    app: Application,
    pckg?: Package,
    clazz?: Class
  ) => void;
  // sendCutInsertMessage(destination: Application | Package): void;
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
      const state = get();
      state.restructureMode = false;
      state.landscapeData = null;
      state.newMeshCounter = 1;
      state.meshModelTextureMappings = [];
      state.commModelColorMappings = [];
      state.deletedDataModels = [];
      state.clipboard = '';
      state.clippedMesh = null;
      state.createdClassCommunication = [];
      state.allClassCommunications = [];
      state.copiedClassCommunications = new Map();
      state.updatedClassCommunications = new Map();
      state.completelyDeletedClassCommunications = new Map();
      state.deletedClassCommunications = [];
      state.sourceClass = null;
      state.targetClass = null;
    },
    setSourceOrTargetClass: (type: string) => {
      const state = get();
      if (type == 'source' && isClass(state.clippedMesh))
        state.sourceClass = state.clippedMesh;
      else if (type == 'target' && isClass(state.clippedMesh))
        state.targetClass = state.clippedMesh;
    },
    setCommunicationSourceClass: (clazz: Class) => {
      get().sourceClass = clazz;
    },
    setCommunicationTargetClass: (clazz: Class) => {
      get().targetClass = clazz;
    },
    addCollaborativeCommunication: (
      sourceClassId: string,
      targetClassId: string,
      methodName: string
    ) => {
      const state = get();
      state.sourceClass = getClassById(
        state.landscapeData?.structureLandscapeData as StructureLandscapeData,
        sourceClassId
      ) as Class;
      state.targetClass = getClassById(
        state.landscapeData?.structureLandscapeData as StructureLandscapeData,
        targetClassId
      ) as Class;
      state.addCommunication(methodName, true);
    },
    addCommunication: (methodName: string, collabMode: boolean = false) => {
      //TODO: Implement this function
    },
    setLandscapeData: (newData: LandscapeData | null) => {
      get().landscapeData = newData;
    },
    getAppFromPackage: (pckg: Package) => {
      const state = get();
      let app: Application | undefined;
      if (state.landscapeData?.structureLandscapeData) {
        if (!pckg.parent)
          app = getApplicationFromPackage(
            state.landscapeData.structureLandscapeData,
            pckg.id
          );
        else
          app = getApplicationFromSubPackage(
            state.landscapeData.structureLandscapeData,
            pckg.id
          );
      }
      return app;
    },
    removeInsertTexture: (element: Package) => {
      const state = get();
      let app: Application;
      if (element.parent) {
        app = getApplicationFromSubPackage(
          state.landscapeData?.structureLandscapeData as StructureLandscapeData,
          element.id
        ) as Application;
      } else {
        app = getApplicationFromPackage(
          state.landscapeData?.structureLandscapeData as StructureLandscapeData,
          element.id
        ) as Application;
      }
      state.removeMeshModelTextureMapping(
        RestructureAction.CutInsert,
        EntityType.Package,
        app,
        element
      );
    },
    undoDuplicateApp: (app: Application) => {
      const state = get();
      const undoMapping = state.meshModelTextureMappings.find(
        (mapping) =>
          mapping.action === RestructureAction.CopyPaste &&
          mapping.meshType === EntityType.App &&
          mapping.app === app
      );
      state.meshModelTextureMappings.removeObject(
        undoMapping as MeshModelTextureMapping
      );

      const keyToRemove = 'DUPLICATED|' + app.id;

      state.copiedClassCommunications.delete(keyToRemove);
    },
    undoCopyPackage(app: Application, pckg: Package) {
      const state = get();
      const undoMapping = state.meshModelTextureMappings.find(
        (mapping) =>
          mapping.action === RestructureAction.CopyPaste &&
          mapping.meshType === EntityType.Package &&
          mapping.app === app &&
          mapping.pckg === pckg
      );
      state.meshModelTextureMappings.removeObject(
        undoMapping as MeshModelTextureMapping
      );

      const keyToRemove = 'COPIED|' + pckg.id;

      state.copiedClassCommunications.delete(keyToRemove);
    },
    //TODO: app gets passed but not used
    undoCopyClass(app: Application, clazz: Class) {
      const state = get();
      const keyToRemove = 'DUPLICATED|' + clazz.id;
      const copiedComms = state.copiedClassCommunications.get(keyToRemove);
      if (copiedComms) {
        copiedComms.forEach((comm) => {
          state.deletedClassCommunications.push(comm);
        });
        state.copiedClassCommunications.delete(keyToRemove);
      }
    },
    findAppliedTexture: (
      elem: Application | Package | Class,
      action?: RestructureAction
    ) => {
      const state = get();
      return state.meshModelTextureMappings.find(
        (entry) =>
          (entry.app === elem || entry.pckg === elem || entry.clazz === elem) &&
          (entry.action === RestructureAction.Create || entry.action === action)
      );
    },
    storeDeletedAppData: (app: Application) => {
      const state = get();
      state.deletedDataModels.removeObject(app);
      const allPackages = getAllPackagesInApplication(app);
      const allClasses = getAllClassesInApplication(app);
      allPackages.forEach((pckg) => {
        state.deletedDataModels.removeObject(pckg);
      });
      allClasses.forEach((clazz) => {
        state.deletedDataModels.removeObject(clazz);
      });
    },
    removeMeshModelTextureMapping: (
      action: RestructureAction,
      entityType: EntityType,
      app: Application,
      pckg?: Package,
      clazz?: Class
    ) => {
      const state = get();
      const undoMapping = state.meshModelTextureMappings.find(
        (mapping) =>
          mapping.action === action &&
          mapping.meshType === entityType &&
          mapping.app.id === app.id &&
          mapping.pckg?.id === pckg?.id &&
          mapping.clazz?.id === clazz?.id
      );

      state.meshModelTextureMappings.removeObject(
        undoMapping as MeshModelTextureMapping
      );
    },
    restoreDeletedAppData: (app: Application) => {
      const state = get();
      state.deletedDataModels.removeObject(app);
      const allPackages = getAllPackagesInApplication(app);
      const allClasses = getAllClassesInApplication(app);
      allPackages.forEach((pckg) => {
        state.deletedDataModels.removeObject(pckg);
      });
      allClasses.forEach((clazz) => {
        state.deletedDataModels.removeObject(clazz);
      });
    },
    storeDeletedPackageData: (pckg: Package) => {
      const state = get();
      const allPackages = getSubPackagesOfPackage(pckg, true);
      const allClasses = getClassesInPackage(pckg, true);
      state.deletedDataModels.pushObject(pckg);
      allPackages.forEach((pckg) => {
        state.deletedDataModels.pushObject(pckg);
      });
      allClasses.forEach((clazz) => {
        state.deletedDataModels.pushObject(clazz);
      });
    },
    cutPackage(pckg: Package) {
      const state = get();
      state.clipboard = pckg.name;
      state.clippedMesh = pckg;
    },
    cutClass(clazz: Class) {
      const state = get();
      state.clipboard = clazz.name;
      state.clippedMesh = clazz;
    },
    resetClipboard() {
      const state = get();
      state.clipboard = '';
      state.clippedMesh = null;
    },
    getApp(appChild: Package | Class) {
      const state = get();
      const landscapeData = state.landscapeData
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
    restoreDeletedPackageData(pckg: Package) {
      const state = get();
      state.deletedDataModels.removeObject(pckg);
      const allPackages = getSubPackagesOfPackage(pckg, true);
      const allClasses = getClassesInPackage(pckg, true);
      allPackages.forEach((pckg) => {
        state.deletedDataModels.removeObject(pckg);
      });
      allClasses.forEach((clazz) => {
        state.deletedDataModels.removeObject(clazz);
      });
    },
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
