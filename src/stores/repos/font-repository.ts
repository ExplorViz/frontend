import { create } from 'zustand';
import { Font } from 'three-stdlib';

interface FontRepositoryState {
  font?: Font;
  setFont: (font: Font) => void;
}

export const useFontRepositoryStore = create<FontRepositoryState>(
  (set, get) => ({
    font: undefined,

    setFont: (font: Font) => {
      set({ font: font });
    },
  })
);
