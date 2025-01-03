import { createStore } from 'zustand/vanilla';
import * as THREE from 'three';

interface VrMenuFactoryState {
    scene: THREE.Scene;
    renderer: THREE.WebGLRenderer;
}

export const useVrMenuFactoryStore = createStore<VrMenuFactoryState>(() => ({
    scene: new THREE.Scene(),
    renderer: new THREE.WebGLRenderer(),
}));

