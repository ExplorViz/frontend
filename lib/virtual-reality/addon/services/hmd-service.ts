import Service from '@ember/service';
import * as THREE from 'three';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { TGALoader } from 'three/examples/jsm/loaders/TGALoader';

export default class HmdService extends Service.extend({
  // anything which *must* be merged to prototype here
}) {
  headsetModel!: Promise<THREE.Group>;

  init() {
    super.init();

    // Load headset model.
    this.headsetModel = this.loadObjWithMtl({
      path: '/generic_hmd/',
      objFile: 'generic_hmd.obj',
      mtlFile: 'generic_hmd.mtl',
    });
  }

  private loadObjWithMtl({
    path,
    objFile,
    mtlFile,
  }: {
    path: string;
    objFile: string;
    mtlFile: string;
  }): Promise<THREE.Group> {
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
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'hmd-service': HmdService;
  }
}
