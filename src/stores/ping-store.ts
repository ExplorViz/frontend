import { create } from 'zustand';

interface PingStoreState {
  activePingNodeNames: Set<string>;
  addPing: (name: string, durationMs?: number) => void;
}

export const usePingStore = create<PingStoreState>((set) => ({
  activePingNodeNames: new Set(),
  addPing: (name, durationMs = 3000) => {
    set((state) => ({
      activePingNodeNames: new Set([...state.activePingNodeNames, name]),
    }));
    setTimeout(() => {
      set((state) => {
        const next = new Set(state.activePingNodeNames);
        next.delete(name);
        return { activePingNodeNames: next };
      });
    }, durationMs);
  },
}));
