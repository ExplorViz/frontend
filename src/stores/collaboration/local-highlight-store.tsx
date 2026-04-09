import { create } from 'zustand';

// This store holds all locally set highlights
// It is used to construct the list oh highlights in the Visualization store
interface LocalHighlightState {
    // The highloght IDs
    localHighlightedIds: Set<string>;

    // Add or remove a local highlight
    setHighlighted: (id: string, highlight: boolean) => void;

    // Empty the whole store
    reset: () => void;
}

export const useLocalHighlightStore = create<LocalHighlightState>((set) => ({
    localHighlightedIds: new Set(),

    setHighlighted: (id, highlight) => set((state) => {
        const next = new Set(state.localHighlightedIds);
        if (highlight) {
            next.add(id);
        } else {
            next.delete(id);
        }
        return { localHighlightedIds: next };
    }),

    reset: () => set({ localHighlightedIds: new Set() })
}));