import { createStore } from 'zustand/vanilla';

interface ARSettingsState {
    landscapeOpacity: number;
    applicationOpacity: number;
    sidebarWidthInPercent: number | undefined;
    renderCommunication: boolean;
    zoomLevel: number;
    stackPopups: boolean;
}

export const useARSettingsStore = createStore<ARSettingsState>(() => ({
    landscapeOpacity: 0.9,
    applicationOpacity: 0.9,
    sidebarWidthInPercent: undefined,
    renderCommunication: true,
    zoomLevel: 3,
    stackPopups: true,
}));

