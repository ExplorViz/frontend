import { createStore } from 'zustand/vanilla';
import * as THREE from 'three';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { TGALoader } from 'three/examples/jsm/loaders/TGALoader';

interface HMDState {
  headsetModel: Promise<THREE.Group>;
}

let loadObjWithMtl = ({
  path,
  objFile,
  mtlFile,
}: {
  path: string;
  objFile: string;
  mtlFile: string;
}): Promise<THREE.Group> => {
  return new Promise((resolve) => {
    const loadingManager = new THREE.LoadingManager();
    loadingManager.addHandler(/\.tga$/i, new TGALoader());

    const mtlLoader = new MTLLoader(loadingManager);
    mtlLoader.setPath(path);
    mtlLoader.load(mtlFile, (materials) => {
      materials.preload();

      const objLoader = new OBJLoader(loadingManager);
      objLoader.setPath(path);
      objLoader.setMaterials(materials);
      objLoader.load(objFile, resolve);
    });
  });
};

export const useHMDStore = createStore<HMDState>(() => ({
  headsetModel: loadObjWithMtl({
    path: '/extended-reality/generic_hmd/',
    objFile: 'generic_hmd.obj',
    mtlFile: 'generic_hmd.mtl',
  }),
}));
