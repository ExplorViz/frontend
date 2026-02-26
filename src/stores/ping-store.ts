import { create } from 'zustand';

interface PingStoreState {
  activePingEntityIds: Set<string>;
  addPing: (entityId: string, durationMs?: number) => void;
}

export const usePingStore = create<PingStoreState>((set) => ({
  activePingEntityIds: new Set(),
  addPing: (entityId, durationMs = 3000) => {
    set((state) => ({
      activePingEntityIds: new Set([...state.activePingEntityIds, entityId]),
    }));
    setTimeout(() => {
      set((state) => {
        const next = new Set(state.activePingEntityIds);
        next.delete(entityId);
        return { activePingEntityIds: next };
      });
    }, durationMs);
  },
}));
