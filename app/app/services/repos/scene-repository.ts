import Service from '@ember/service';
import { useSceneRepositoryStore } from 'react-lib/src/stores/repos/scene-repository';
import { VisualizationMode } from 'explorviz-frontend/services/collaboration/local-user';
// import { createScene } from 'explorviz-frontend/utils/scene';
import * as THREE from 'three';

export default class SceneRepository extends Service.extend() {
  // scene: THREE.Scene | undefined;
  get scene(): THREE.Scene | undefined {
    return useSceneRepositoryStore.getState().scene!;
  }

  set scene(value: THREE.Scene | undefined) {
    useSceneRepositoryStore.setState({ scene: value });
  }

  // getScene(mode: VisualizationMode = 'browser', replaceScene = false) {
  //   if (!this.scene || replaceScene) {
  //     this.scene = createScene(mode);
  //   }

  //   return this.scene;
  // }

  getScene(mode: VisualizationMode = 'browser', replaceScene = false) {
    return useSceneRepositoryStore.getState().getScene(mode, replaceScene);
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'repos/scene-repository': SceneRepository;
  }
}
