import { create } from 'zustand';
import { TraceTab } from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/toolbar/trace-replayer/trace-tab';

export interface TraceReplayNode {
  id: string;
  sourceClassId: string;
  targetClassId: string;
  start: number;
  end: number;
  parentId?: string;
  childrenIds: string[];
}

interface TraceReplayState {
  timeline: TraceReplayNode[];
  cursor: number;
  playing: boolean;
  speed: number; // animation speed
  eager: boolean;
  afterimage: boolean;
  ready: boolean;
  tabs: TraceTab[];
  opacity: number;

  // derived bounds
  minTs: number;
  maxTs: number;

  // actions
  loadTimeline: (nodes: TraceReplayNode[]) => void;
  play: () => void;
  pause: () => void;
  stop: () => void;
  setCursor: (c: number) => void;
  setSpeed: (s: number) => void;
  setEager: (v: boolean) => void;
  setAfterimage: (v: boolean) => void;
  setReady: (v: boolean) => void;
  setTabs: (tabs: TraceTab[]) => void;
  setOpacity: (v: number) => void;
  tick: (deltaSeconds: number) => void;
}

export const useTraceReplayStore = create<TraceReplayState>((set, get) => ({
  timeline: [],
  cursor: 0,
  playing: false,
  speed: 5,
  eager: true,
  afterimage: true,
  ready: false,
  tabs: [],
  opacity: 0.3,
  minTs: 0,
  maxTs: 0,

  loadTimeline: (nodes) => {
    const minTs = nodes.length > 0 ? Math.min(...nodes.map((n) => n.start)) : 0;
    const maxTs = nodes.length > 0 ? Math.max(...nodes.map((n) => n.end)) : 0;
    set({ timeline: nodes, minTs, maxTs, cursor: minTs });
  },
  play: () => set({ playing: true }),
  pause: () => set({ playing: false }),
  stop: () => set((s) => ({ playing: false, cursor: s.minTs })),
  setCursor: (c) => set({ cursor: c }),
  setSpeed: (s) => set({ speed: s }),
  setEager: (v) => set({ eager: v }),
  setAfterimage: (v) => set({ afterimage: v }),
  setReady: (v) => set({ ready: v }),
  setTabs: (tabs) => set({ tabs }),
  setOpacity: (v) => set({ opacity: v }),
  tick: (deltaSeconds) => {
    const { playing, speed, minTs, maxTs, cursor } = get();
    if (!playing) return;
    const duration = Math.max(1, maxTs - minTs);
    const next = cursor + deltaSeconds * speed * (duration / 1e2);
    if (next >= maxTs) {
      set({ cursor: maxTs, playing: false });
    } else {
      set({ cursor: next });
    }
  },
}));
