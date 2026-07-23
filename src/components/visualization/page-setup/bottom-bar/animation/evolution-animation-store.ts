import { FlatLandscape,  AnimationFrame, AnimationSkeleton} from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import { create } from 'zustand';


export const WINDOW_SIZE = 50;

interface EvolutionAnimationState {
  totalCount: number;
  loadedFrames: Map<number, AnimationFrame>;
  requestedBlocks: Set<number>;
  orderedCommitHashes: string[];
  granularity: number;
  stableFrame: FlatLandscape | null;
  fqnToFirstFrame: Map<string, number>;
  currentFrameIndex: number;
  isPlaying: boolean;
  layoutMode: 'city' | 'spiral';
  timeMode: 'commit' | 'time';
  speedMs: number;
  actions: {
    setSkeleton: (skeleton: AnimationSkeleton) => void;
    setTotalCount: (total: number) => void;
    addFrames: (frame: AnimationFrame[]) => void;
    markBlockRequested: (block: number) => void;
    setGranularity: (granularity: number) => void;
    play: () => void;
    pause: () => void;
    stepForward: () => void;
    stepBack: () => void;
    seekTo: (index: number) => void;
    setLayoutMode: (mode: 'city' | 'spiral') => void;
    setTimeMode: (mode: 'commit' | 'time') => void;
    setSpeed: (ms: number) => void;
    reset: () => void;
  };
}

export const useEvolutionAnimationStore = create<EvolutionAnimationState>((set) => ({
  totalCount: 0,
  loadedFrames: new Map(),
  requestedBlocks: new Set(),
  orderedCommitHashes: [],
  granularity: 1,
  stableFrame: null,
  fqnToFirstFrame: new Map(),
  currentFrameIndex: 0,
  isPlaying: false,
  layoutMode: 'spiral',
  timeMode: 'commit',
  speedMs: 1000,
  actions: {
    setSkeleton: (skeleton) =>
      set({
        stableFrame: skeleton.landscape,
        fqnToFirstFrame: new Map(Object.entries(skeleton.fqnToFirstOrdinal)),
        orderedCommitHashes: skeleton.orderedCommitHashes,
      }),
    setTotalCount: (total) =>
      set({
        totalCount: total,
        loadedFrames: new Map(),
        requestedBlocks: new Set(),
        currentFrameIndex: 0,
        isPlaying: false,
      }),
    addFrames: (frames) =>
      set((s) => {
        const next = new Map(s.loadedFrames);
        frames.forEach((f) => next.set(f.ordinal, f));
        return { loadedFrames: next };
      }),
    markBlockRequested: (block) =>
      set((s) => ({ requestedBlocks: new Set(s.requestedBlocks).add(block) })),
    setGranularity: (granul: number) => set({ granularity: Math.max(1, granul) }),
    play: () => set({ isPlaying: true }),
    pause: () => set({ isPlaying: false }),
    stepForward: () =>
      set((s) => ({
        currentFrameIndex: Math.min(s.currentFrameIndex + 1, s.totalCount - 1),
      })),
    stepBack: () =>
      set((s) => ({
        currentFrameIndex: Math.max(s.currentFrameIndex - 1, 0),
      })),
    seekTo: (index) =>
      set((s) => ({
        currentFrameIndex: Math.max(0, Math.min(index, s.totalCount - 1)),
      })),
    setLayoutMode: (mode: 'city' | 'spiral') => set({ layoutMode: mode }),
    setTimeMode: (mode: 'commit' | 'time') => set({ timeMode: mode }),
    setSpeed: (ms) => set({ speedMs: ms }),
    reset: () =>
      set({
        totalCount: 0,
        loadedFrames: new Map(),
        requestedBlocks: new Set(),
        orderedCommitHashes: [],
        stableFrame: null,
        currentFrameIndex: 0,
        isPlaying: false,
      }),
  },
}));

export const getCurrentFrame = (): FlatLandscape | null => {
  const { loadedFrames, currentFrameIndex } = useEvolutionAnimationStore.getState();
  return loadedFrames.get(currentFrameIndex)?.landscape ?? null;
};
