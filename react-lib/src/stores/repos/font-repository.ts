import { create } from 'zustand';
import { Font } from 'three/examples/jsm/loaders/FontLoader';

interface FontRepositoryState {
  font?: Font;
}

export const useFontRepositoryStore = create<FontRepositoryState>(() => ({
  font: undefined,
}));
