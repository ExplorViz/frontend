import { createStore } from 'zustand/vanilla';
import { useHeatmapConfigurationStore } from 'react-lib/src/stores/heatmap/heatmap-configuration';
import { useApplicationRendererStore } from 'react-lib/src/stores/application-renderer';

interface ARSettingsState {
    landscapeOpacity: number; // tracked
    applicationOpacity: number; // tracked
    sidebarWidthInPercent: number | undefined;
    renderCommunication: boolean; // tracked
    zoomLevel: number; // tracked
    stackPopups: boolean; // tracked
    setApplicationOpacity: (opacity: number) => void;
    updateApplicationOpacity: () => void;
}

export const useARSettingsStore = createStore<ARSettingsState>((set, get) => ({
    landscapeOpacity: 0.9,
    applicationOpacity: 0.9,
    sidebarWidthInPercent: undefined,
    renderCommunication: true,
    zoomLevel: 3,
    stackPopups: true,

    setApplicationOpacity: (opacity: number) => {
        set({ applicationOpacity:  opacity });
        if (!useHeatmapConfigurationStore.getState().heatmapActive) {
          get().updateApplicationOpacity();
        }
    },

    updateApplicationOpacity: () => {
        useApplicationRendererStore.getState().getOpenApplications()
          .forEach((applicationObject3D) => {
            applicationObject3D.setOpacity(get().applicationOpacity);
          });
    },
}));

