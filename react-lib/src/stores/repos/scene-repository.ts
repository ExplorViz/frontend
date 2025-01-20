import { createStore } from "zustand/vanilla";
import { VisualizationMode } from "react-lib/src/stores/collaboration/local-user";
import { createScene } from "react-lib/src/utils/scene";

interface SceneRepositoryState {
  scene?: THREE.Scene;
  getScene: (mode: VisualizationMode, replaceScene: boolean) => THREE.Scene;
}

export const useSceneRepositoryStore = createStore<SceneRepositoryState>(
  (set, get) => ({
    scene: undefined,
    getScene: (
      mode: VisualizationMode = "browser",
      replaceScene: boolean = false
    ) => {
      const state = get();
      if (!state.scene || replaceScene) {
        state.scene = createScene(mode);
      }

      return state.scene;
    },
  })
);
