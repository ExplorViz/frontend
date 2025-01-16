import { createStore } from 'zustand/vanilla';
import { VisualizationMode } from 'explorviz-frontend/services/collaboration/local-user';
import { createScene } from 'explorviz-frontend/utils/scene';

interface SceneRepositoryState {
  scene?: THREE.Scene;
  getScene: (mode:VisualizationMode, replaceScene:boolean) => THREE.Scene;
}

export const useSceneRepositoryStore = createStore<SceneRepositoryState>((set, get) => ({
    scene: undefined,
    getScene: (mode:VisualizationMode, replaceScene:boolean) => {
      const state = get();
      if (!state.scene || replaceScene) {
        state.scene = createScene(mode);
      }

      return state.scene;
    }
}))