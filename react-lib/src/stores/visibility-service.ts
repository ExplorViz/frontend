import { createStore } from "zustand/vanilla";

// TODO replace with import from rendering-service
export type EvolutionModeRenderingConfiguration = {
  renderDynamic: boolean;
  renderStatic: boolean;
  renderOnlyDifferences: boolean;
};

interface VisibilityServiceState {
  _evolutionModeRenderingConfiguration: EvolutionModeRenderingConfiguration;
  getCloneOfEvolutionModeRenderingConfiguration: () => EvolutionModeRenderingConfiguration;
  applyEvolutionModeRenderingConfiguration: (
    newEvolutionModeRenderingConfiguration: EvolutionModeRenderingConfiguration
  ) => void;
}

export const useVisibilityServiceStore = createStore<VisibilityServiceState>(
  (set, get) => ({
    _evolutionModeRenderingConfiguration: {
      renderDynamic: true,
      renderStatic: true,
      renderOnlyDifferences: false,
    },
    getCloneOfEvolutionModeRenderingConfiguration: () => {
      // return clone so that we don't unintentionally alter the object via
      // the getter
      return structuredClone(get()._evolutionModeRenderingConfiguration);
    },
    applyEvolutionModeRenderingConfiguration: (
      newEvolutionModeRenderingConfiguration: EvolutionModeRenderingConfiguration
    ) => {
      // TODO implement me!
    },
  })
);

// TODO private methods
