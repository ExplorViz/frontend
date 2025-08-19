import { create } from 'zustand';
import * as THREE from 'three';

export type PingRequest = {
  pingedObject: THREE.Object3D;
  position: THREE.Vector3;
  durationMs: number;
  replay?: boolean;
  restartable?: boolean;
};

type State = {
  queue: PingRequest[];
  push: (req: PingRequest) => void;
  shift: () => void;
  clear: () => void;
};

export const usePingStore = create<State>((set) => ({
  queue: [],
  push: (req) => set((s) => ({ queue: [...s.queue, req] })),
  shift: () => set((s) => ({ queue: s.queue.slice(1) })),
  clear: () => set({ queue: [] }),
}));
