import { createStore } from 'zustand/vanilla';

interface ConfigurationState {
  annotationPosition: Position2D | undefined;
  commCurveHeightDependsOnDistance: boolean;
  commCurveHeightMultiplier: number;
  commWidthMultiplier: number;
  isCommRendered: boolean;
  popupPosition: Position2D | undefined;
  semanticZoomEnabled: boolean;
}

interface Position2D {
  x: number;
  y: number;
}

export const useConfigurationStore = createStore<ConfigurationState>(() => ({
  annotationPosition: undefined,
  commCurveHeightDependsOnDistance: true,
  commCurveHeightMultiplier: 1,
  commWidthMultiplier: 1,
  isCommRendered: true,
  popupPosition: undefined,
  semanticZoomEnabled: false,
}));
