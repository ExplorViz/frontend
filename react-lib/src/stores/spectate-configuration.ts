import { createStore } from 'zustand/vanilla';

interface SpectateConfigurationState {
    spectateConfig: SpectateConfig | null;
}

export type SpectateConfig = {
    id: string;
    user: string;
    devices: { deviceId: string; projectionMatrix: number[] }[];
  };

export const useSpectateConfigurationStore = createStore<SpectateConfigurationState>(() => ({
    spectateConfig: null,
}));

