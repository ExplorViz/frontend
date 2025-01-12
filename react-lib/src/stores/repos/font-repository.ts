import { createStore } from 'zustand/vanilla';
import { Font } from 'three/examples/jsm/loaders/FontLoader';

interface FontRepositoryState {
  font?: Font;
}

export const useFontRepositoryStore = createStore<FontRepositoryState>(() => ({
  font: undefined,
}));