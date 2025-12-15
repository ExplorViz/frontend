import { create } from 'zustand';

interface ConfigurationState {
  annotationPosition: Position2D | undefined;
  commCurveHeightMultiplier: number;
  commWidthMultiplier: number;
  isCommRendered: boolean;
  popupPosition: Position2D | undefined;
  setIsCommRendered: (value: boolean) => void;
}

interface Position2D {
  x: number;
  y: number;
}

export const useConfigurationStore = create<ConfigurationState>((set) => ({
  annotationPosition: undefined,
  commCurveHeightMultiplier: 1,
  commWidthMultiplier: 1,
  isCommRendered: true,
  popupPosition: undefined,
  setIsCommRendered: (value: boolean) => set({ isCommRendered: value }),
}));
