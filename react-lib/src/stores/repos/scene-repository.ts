import { createStore } from 'zustand/vanilla';

interface SceneRepositoryState {
  scene?: THREE.Scene;
}

export const useSceneRepositoryStore = createStore<SceneRepositoryState>(() => ({
    scene: undefined,
}))