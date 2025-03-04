import { create } from 'zustand';
import { VisualizationMode } from 'react-lib/src/stores/collaboration/local-user';
import { createScene } from 'react-lib/src/utils/scene';

interface SceneRepositoryState {
  scene?: THREE.Scene;
  getScene: (mode: VisualizationMode, replaceScene: boolean) => THREE.Scene;
}

export const useSceneRepositoryStore = create<SceneRepositoryState>(
  (set, get) => ({
    scene: undefined,

    getScene: (
      mode: VisualizationMode = 'browser',
      replaceScene: boolean = false
    ) => {
      if (!get().scene || replaceScene) {
        set({ scene: createScene(mode) });
      }

      return get().scene!;
    },
  })
);
