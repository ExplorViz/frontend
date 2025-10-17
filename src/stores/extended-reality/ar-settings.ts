import { create } from 'zustand';

interface ARSettingsState {
  landscapeOpacity: number; // tracked
  applicationOpacity: number; // tracked
  sidebarWidthInPercent: number | undefined;
  renderCommunication: boolean; // tracked
  zoomEnabled: boolean;
  zoomLevel: number; // tracked
  stackPopups: boolean; // tracked
  toggleZoomEnabled: () => void;
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
}));
