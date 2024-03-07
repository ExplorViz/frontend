import { createStore } from 'zustand/vanilla';

interface SceneRepositoryState {
  scene: THREE.Scene | undefined;
}

export const useSceneRepositoryStore = createStore<SceneRepositoryState>(() => ({
  scene: undefined,
}));
