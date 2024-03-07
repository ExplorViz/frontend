import Service from '@ember/service';
import { VisualizationMode } from 'collaborative-mode/services/local-user';
import { createScene } from 'explorviz-frontend/utils/scene';
import { useSceneRepositoryStore } from 'some-react-lib/src/stores/repos/scene-repository';

export default class SceneRepository extends Service {
  get scene(): THREE.Scene | undefined {
    return useSceneRepositoryStore.getState().scene;
  }

  set scene(scene: THREE.Scene) {
    useSceneRepositoryStore.setState({ scene });
  }

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
