import { createStore } from 'zustand/vanilla';
// import { LandscapeData } from 'react-lib/src/utils/landscape-schemes/landscape-data';
// import {
//     Application,
//     Class,
//     Package,
//     isApplication,
//     isClass,
//     isPackage,
//     StructureLandscapeData,
//   } from 'react-lib/src/utils/landscape-schemes/structure-data';
// import {
//     Application,
//     Class,
//     Package,
//     isApplication,
//     isClass,
//     isPackage,
//     StructureLandscapeData,
// } from 'react-lib/src/utils/landscape-schemes/structure-data';
//   import {
//     RestructureAction,
//     EntityType,
// } from 'react-lib/src/utils/restructure-helper';
// import ClassCommunication from 'react-lib/src/utils/landscape-schemes/dynamic/class-communication';

// type MeshModelTextureMapping = {
//     action: RestructureAction;
//     meshType: EntityType;
//     texturePath: string;
//     app: Application;
//     pckg?: Package;
//     clazz?: Class;
// };

// type CommModelColorMapping = {
//     action: RestructureAction;
//     comm: ClassCommunication;
//     color: THREE.Color;
//   };

// type diverseDataModel = Application | Package | Class | ClassCommunication;

interface LandscapeRestructureState {
    restructureMode: boolean;
    // landscapeData: LandscapeData | null;
    newMeshCounter: number;
    // meshModelTextureMappings: MeshModelTextureMapping[];
    // commModelColorMappings: CommModelColorMapping[];
    // deletedDataModels: diverseDataModel[];
    canvas?: HTMLCanvasElement;
    clipboard: string;
    // clippedMesh: Package | Class | null;
    // createdClassCommunication: ClassCommunication[];
    // allClassCommunications: ClassCommunication[];
    // copiedClassCommunications: Map<string, ClassCommunication[]>;
    // completelyDeletedClassCommunications: Map<string, ClassCommunication[]>;
    // deletedClassCommunications: ClassCommunication[];
    // sourceClass: Class | null;
    // targetClass: Class | null;
}

export const useLandscapeRestructureStore = createStore<LandscapeRestructureState>(() => ({
    restructureMode: false,
    newMeshCounter: 1,
    canvas: undefined,
    clipboard: '',
}));