import Service from '@ember/service';
import { VisualizationMode } from 'collaboration/services/local-user';
import { createScene } from 'explorviz-frontend/utils/scene';
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
