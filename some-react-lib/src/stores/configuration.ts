import { createStore } from 'zustand/vanilla'

interface ConfigurationState {
  isCommRendered: boolean;
  commCurveHeightDependsOnDistance: boolean;
  commCurveHeightMultiplier: number;
  commWidthMultiplier: number;
  popupPosition: Position2D | undefined;
}

interface Position2D {
  x: number;
  y: number;
}

export const useConfigurationStore = createStore<ConfigurationState>(() => ({
  isCommRendered: true,
  commCurveHeightDependsOnDistance: true,
  commCurveHeightMultiplier: 1,
  commWidthMultiplier: 1,
  popupPosition: undefined,
}));
