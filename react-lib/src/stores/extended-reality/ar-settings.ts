import { create } from 'zustand';
import { useHeatmapConfigurationStore } from 'react-lib/src/stores/heatmap/heatmap-configuration';
import { useApplicationRendererStore } from 'react-lib/src/stores/application-renderer';

interface ARSettingsState {
  landscapeOpacity: number; // tracked
  applicationOpacity: number; // tracked
  sidebarWidthInPercent: number | undefined;
  renderCommunication: boolean; // tracked
  zoomEnabled: boolean;
  zoomLevel: number; // tracked
  stackPopups: boolean; // tracked
  toggleZoomEnabled: () => void;
  setApplicationOpacity: (opacity: number) => void;
  updateApplicationOpacity: () => void;
  setStackPopups: (value: boolean) => void;
}

export const useARSettingsStore = create<ARSettingsState>((set, get) => ({
  landscapeOpacity: 0.9,
  applicationOpacity: 0.9,
  sidebarWidthInPercent: undefined,
  renderCommunication: true,
  zoomEnabled: false,
  zoomLevel: 3,
  stackPopups: true,

  toggleZoomEnabled: () =>
    set((state) => ({ zoomEnabled: !state.zoomEnabled })),

  setStackPopups: (value: boolean) => {
    set({ stackPopups: value });
  },

  setApplicationOpacity: (opacity: number) => {
    set({ applicationOpacity: opacity });
    if (!useHeatmapConfigurationStore.getState().heatmapActive) {
      get().updateApplicationOpacity();
    }
  },

  updateApplicationOpacity: () => {
    useApplicationRendererStore
      .getState()
      .getOpenApplications()
      .forEach((applicationObject3D) => {
        applicationObject3D.setOpacity(get().applicationOpacity); // TODO: Does this make problems, because not updating state of applicationRenderer?
      });
  },
}));
