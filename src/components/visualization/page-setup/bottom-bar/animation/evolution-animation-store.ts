import { FlatLandscape,  AnimationFrame, AnimationSkeleton, AnimationDeltaFrame} from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
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
  bucketSize: number;
  orderedCommitTimeStamps: number[];
  agingEnabled: boolean;
  agingCommits: number; // threshold in frames (commit mode)
  agingMs: number; // threshold in milliseconds (time mode)
  deltaMode: boolean;
  deltaFrames: Map<number, AnimationDeltaFrame>;
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
    setBucketSize: (bucketSize: number) => void;
    setAgingEnabled: (enabled: boolean) => void;
    setAgingCommits: (commits: number) => void;
    setAgingMs: (ms: number) => void;
    addDeltaFrames: (frames: AnimationDeltaFrame[]) => void;
    setDeltaMode: (enabled: boolean) => void;
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
  bucketSize: 86400000,
  orderedCommitTimeStamps: [],
  agingEnabled: false,
  agingCommits: 10,
  agingMs: 2592000000, // 30 days
  deltaMode: true,
  deltaFrames: new Map(),
  actions: {
    setSkeleton: (skeleton) =>
      set({
        stableFrame: skeleton.landscape,
        fqnToFirstFrame: new Map(Object.entries(skeleton.fqnToFirstOrdinal)),
        orderedCommitHashes: skeleton.orderedCommitHashes,
        orderedCommitTimeStamps: skeleton.orderedCommitTimeStamps,
      }),
    setTotalCount: (total) =>
      set({
        totalCount: total,
        loadedFrames: new Map(),
        requestedBlocks: new Set(),
        currentFrameIndex: 0,
        isPlaying: false,
        deltaFrames: new Map(),
      }),
    addFrames: (frames) =>
      set((s) => {
        const next = new Map(s.loadedFrames);
        frames.forEach((f) => next.set(f.ordinal, f));
        return { loadedFrames: next };
      }),
    markBlockRequested: (block) =>
      set((s) => ({ requestedBlocks: new Set(s.requestedBlocks).add(block) })),
    setGranularity: (granul: number) =>
      set({ granularity: Math.max(1, granul) }),
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
    setBucketSize: (bucketSize) => set({ bucketSize: Math.max(1, bucketSize) }),
    setAgingEnabled: (enabled) => set({ agingEnabled: enabled }),
    setAgingCommits: (commits) => set({ agingCommits: Math.max(1, commits) }),
    setAgingMs: (ms) => set({ agingMs: Math.max(1, ms) }),
    addDeltaFrames: (frames) =>
      set((s) => {
        const next = new Map(s.deltaFrames);
        frames.forEach((f) => next.set(f.ordinal, f));
        return { deltaFrames: next };
      }),
    setDeltaMode: (enabled) =>
      set({
        deltaMode: enabled,
        loadedFrames: new Map(),
        deltaFrames: new Map(),
        requestedBlocks: new Set(),
      }),
    reset: () =>
      set({
        totalCount: 0,
        loadedFrames: new Map(),
        requestedBlocks: new Set(),
        orderedCommitHashes: [],
        stableFrame: null,
        currentFrameIndex: 0,
        isPlaying: false,
        deltaFrames: new Map(),
      }),
  },
}));

export const getCurrentFrame = (): FlatLandscape | null => {
  const { loadedFrames, currentFrameIndex } = useEvolutionAnimationStore.getState();
  return loadedFrames.get(currentFrameIndex)?.landscape ?? null;
};
