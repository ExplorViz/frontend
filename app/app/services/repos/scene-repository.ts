import Service from '@ember/service';
import { VisualizationMode } from 'explorviz-frontend/services/collaboration/local-user';
import { createScene } from 'react-lib/src/utils/scene';
import * as THREE from 'three';

export default class SceneRepository extends Service.extend() {
  scene: THREE.Scene | undefined;

  getScene(mode: VisualizationMode = 'browser', replaceScene = false) {
    if (!this.scene || replaceScene) {
      this.scene = createScene(mode);
    }

    return this.scene;
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'repos/scene-repository': SceneRepository;
  }
}
