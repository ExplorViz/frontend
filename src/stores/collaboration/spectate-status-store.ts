import { create } from 'zustand';

// This store shows who is spectating the current user
// It is used to determine wether the camera data needs to be loaded up or not

interface SpectateStatusState {
    spectators: Set<string>;
    addSpectator: (id: string) => void;
    removeSpectator: (id: string) => void;
}

export const useSpectateStatusStore = create<SpectateStatusState>((set) => ({
    spectators: new Set(),

    addSpectator: (id) => set((state) => {
        const newSet = new Set(state.spectators);
        newSet.add(id);
        return { spectators: newSet };
    }),

    removeSpectator: (id) => set((state) => {
        const newSet = new Set(state.spectators);
        newSet.delete(id);
        return { spectators: newSet };
    })
}));