import { create } from 'zustand';

// This store is responsible to keep track of the highlights of elements other users in the same room are applying
interface RemoteHighlightEntry {
    userId: string;
    color: string;
}

interface RemoteHighlightingState {
    remoteHighlights: Map<string, RemoteHighlightEntry>;
    setRemoteHighlights: (highlights: Map<string, RemoteHighlightEntry>) => void;
    getColor: (entityId: string) => string | null;
}

export const useRemoteHighlightingStore = create<RemoteHighlightingState>((set, get) => ({
    remoteHighlights: new Map(),

    setRemoteHighlights: (highlights) => set({ remoteHighlights: highlights }),

    getColor: (entityId) => {
        const entry = get().remoteHighlights.get(entityId);
        return entry ? entry.color : null;
    }
}));