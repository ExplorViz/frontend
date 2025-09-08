import { create } from 'zustand';

interface ConfigurationState {
  annotationPosition: Position2D | undefined;
  commCurveHeightDependsOnDistance: boolean;
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
  commCurveHeightDependsOnDistance: true,
  commCurveHeightMultiplier: 1,
  commWidthMultiplier: 1,
  isCommRendered: true,
  popupPosition: undefined,
  setIsCommRendered: (value: boolean) => set({ isCommRendered: value }),
}));
