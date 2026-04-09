import { create } from 'zustand';
import { useVisualizationStore } from '../visualization-store';

// This store is used to store the playroomkit connection and room details
interface PlayroomConnectionState {
    isConnected: boolean;
    isLobbyOpen: boolean;

    openLobby: () => void;
    closeLobby: () => void;
    setConnected: (status: boolean) => void;
    disconnect: () => void;
}

export const usePlayroomConnectionStore = create<PlayroomConnectionState>((set) => ({
    isConnected: false,
    isLobbyOpen: false,

    openLobby: () => set({ isLobbyOpen: true }),
    closeLobby: () => set({ isLobbyOpen: false }),

    setConnected: (status) => {
        if (status) {
            // Upon entering a room, delete all local highlights to start with a fresh room
            useVisualizationStore.getState().actions.removeAllHighlightedEntityIds();
        }
        set({ isConnected: status, isLobbyOpen: false })
    },

    disconnect: () => {
        set({ isConnected: false, isLobbyOpen: false });
        // Reload to leave the room
        window.location.reload();
    },
}));