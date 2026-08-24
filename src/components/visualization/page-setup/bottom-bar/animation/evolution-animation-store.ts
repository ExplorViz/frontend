import {
  AnimationDeltaFrame,
  AnimationFrame,
  AnimationSkeleton,
  FlatLandscape,
} from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import { create } from 'zustand';
import {
  computeEvolutionFrameVisuals,
  EvolutionBuildingVisualState,
  mergeEvolutionVisualStates,
} from './evolution-frame-visuals';

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
  rangeFrom: number;
  rangeTo: number;
  orderedCommitTimestamps: number[];
  agingEnabled: boolean;
  agingCommits: number;
  agingMs: number;
  loadedAgingWindow: number;
  deltaMode: boolean;
  deltaFrames: Map<number, AnimationDeltaFrame>;
  buildingVisualStates: Map<string, EvolutionBuildingVisualState>;
  frameVersion: number;
  changedBuildingIds: Set<string>;
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
    setRange: (from: number, to: number) => void;
    setAgingEnabled: (enabled: boolean) => void;
    setAgingCommits: (commits: number) => void;
    setAgingMs: (ms: number) => void;
    addDeltaFrames: (frames: AnimationDeltaFrame[]) => void;
    setDeltaMode: (enabled: boolean) => void;
    reapplyCurrentFrameVisuals: () => void;
    reset: () => void;
    restart: () => void;
  };
}
function agingWindowPatch(
  state: EvolutionAnimationState,
  enabled: boolean,
  commits: number,
  ms: number
): Partial<EvolutionAnimationState> {
  const wanted = enabled ? (state.timeMode === 'time' ? ms : commits) : 1;
  if (wanted <= state.loadedAgingWindow) {
    return {};
  }
  return {
    loadedAgingWindow: wanted,
    deltaFrames: new Map(),
    requestedBlocks: new Set(),
    buildingVisualStates: new Map(),
    frameVersion: 0,
    changedBuildingIds: new Set(),
  };
}

function frameMeaningPatch(): Partial<EvolutionAnimationState> {
  return {
    totalCount: 0,
    currentFrameIndex: 0,
    isPlaying: false,
    loadedFrames: new Map(),
    deltaFrames: new Map(),
    requestedBlocks: new Set(),
    buildingVisualStates: new Map(),
    frameVersion: 0,
    changedBuildingIds: new Set(),
  };
}

function applyFrameVisuals(
  state: EvolutionAnimationState,
  frameIndex: number = state.currentFrameIndex
): Partial<EvolutionAnimationState> {
  const nextVisuals = computeEvolutionFrameVisuals({
    currentFrameIndex: frameIndex,
    stableFrame: state.stableFrame,
    loadedFrames: state.loadedFrames,
    deltaFrames: state.deltaFrames,
    deltaMode: state.deltaMode,
    agingEnabled: state.agingEnabled,
    agingCommits: state.agingCommits,
    agingMs: state.agingMs,
    timeMode: state.timeMode,
  });

  if (!nextVisuals) {
    return {};
  }

  const merged = mergeEvolutionVisualStates(
    state.buildingVisualStates,
    nextVisuals,
    state.frameVersion
  );

  if (!merged.changed) {
    return {};
  }

  return {
    buildingVisualStates: merged.buildingVisualStates,
    frameVersion: merged.frameVersion,
    changedBuildingIds: merged.changedBuildingIds,
  };
}

function updateFrameIndex(
  state: EvolutionAnimationState,
  frameIndex: number
): Partial<EvolutionAnimationState> {
  return {
    currentFrameIndex: frameIndex,
    ...applyFrameVisuals(state, frameIndex),
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
  rangeFrom: 0,
  rangeTo: 0,
  loadedAgingWindow: 1,
  orderedCommitTimestamps: [],
  agingEnabled: false,
  agingCommits: 10,
  agingMs: 2592000000,
  deltaMode: true,
  deltaFrames: new Map(),
  buildingVisualStates: new Map(),
  frameVersion: 0,
  changedBuildingIds: new Set(),
  actions: {
    setSkeleton: (skeleton) =>
      set({
        stableFrame: skeleton.landscape,
        fqnToFirstFrame: new Map(Object.entries(skeleton.fqnToFirstOrdinal)),
        orderedCommitHashes: skeleton.orderedCommitHashes,
        orderedCommitTimestamps: skeleton.orderedCommitTimestamps,
      }),
    setTotalCount: (total) =>
      set((s) => ({
        totalCount: total,
        loadedFrames: new Map(),
        requestedBlocks: new Set(),
        currentFrameIndex: 0,
        isPlaying: false,
        deltaFrames: new Map(),
        buildingVisualStates: new Map(),
        frameVersion: 0,
        changedBuildingIds: new Set(),
        loadedAgingWindow: s.agingEnabled
          ? s.timeMode === 'time'
            ? s.agingMs
            : s.agingCommits
          : 1,
      })),
    addFrames: (frames) =>
      set((s) => {
        const next = new Map(s.loadedFrames);
        frames.forEach((f) => next.set(f.ordinal, f));
        const nextState = { ...s, loadedFrames: next };
        return {
          loadedFrames: next,
          ...applyFrameVisuals(nextState),
        };
      }),
    markBlockRequested: (block) =>
      set((s) => ({
        requestedBlocks: new Set(s.requestedBlocks).add(block),
      })),
    setGranularity: (granul: number) =>
      set({ granularity: Math.max(1, granul), ...frameMeaningPatch() }),
    play: () => set({ isPlaying: true }),
    pause: () => set({ isPlaying: false }),
    stepForward: () =>
      set((s) => {
        const nextIndex = Math.min(s.currentFrameIndex + 1, s.totalCount - 1);
        if (nextIndex === s.currentFrameIndex) return s;
        return updateFrameIndex(s, nextIndex);
      }),
    stepBack: () =>
      set((s) => {
        const nextIndex = Math.max(s.currentFrameIndex - 1, 0);
        if (nextIndex === s.currentFrameIndex) return s;
        return updateFrameIndex(s, nextIndex);
      }),
    seekTo: (index) =>
      set((s) => {
        const nextIndex = Math.max(0, Math.min(index, s.totalCount - 1));
        if (nextIndex === s.currentFrameIndex) return s;
        return updateFrameIndex(s, nextIndex);
      }),
    setLayoutMode: (mode: 'city' | 'spiral') => set({ layoutMode: mode }),
    setTimeMode: (mode: 'commit' | 'time') =>
      set({ timeMode: mode, ...frameMeaningPatch() }),
    setSpeed: (ms) => set({ speedMs: ms }),
    setBucketSize: (bucketSize) =>
      set({ bucketSize: Math.max(1, bucketSize), ...frameMeaningPatch() }),
    setRange: (from, to) =>
      set({
        rangeFrom: Math.max(0, from),
        rangeTo: Math.max(0, to),
        stableFrame: null,
        fqnToFirstFrame: new Map(),
        orderedCommitHashes: [],
        orderedCommitTimestamps: [],
        totalCount: 0,
        loadedFrames: new Map(),
        deltaFrames: new Map(),
        requestedBlocks: new Set(),
        currentFrameIndex: 0,
        isPlaying: false,
        buildingVisualStates: new Map(),
        frameVersion: 0,
        changedBuildingIds: new Set(),
      }),
    setAgingEnabled: (enabled) =>
      set((s) => {
        const invalidation = agingWindowPatch(
          s,
          enabled,
          s.agingCommits,
          s.agingMs
        );
        const next = { ...s, ...invalidation, agingEnabled: enabled };
        return {
          agingEnabled: enabled,
          ...invalidation,
          ...applyFrameVisuals(next),
        };
      }),
    setAgingCommits: (commits) =>
      set((s) => {
        const value = Math.max(1, commits);
        const invalidation = agingWindowPatch(
          s,
          s.agingEnabled,
          value,
          s.agingMs
        );
        const next = { ...s, ...invalidation, agingCommits: value };
        return {
          agingCommits: value,
          ...invalidation,
          ...applyFrameVisuals(next),
        };
      }),
    setAgingMs: (ms) =>
      set((s) => {
        const value = Math.max(1, ms);
        const invalidation = agingWindowPatch(
          s,
          s.agingEnabled,
          s.agingCommits,
          value
        );
        const next = { ...s, ...invalidation, agingMs: value };
        return {
          agingMs: value,
          ...invalidation,
          ...applyFrameVisuals(next),
        };
      }),
    addDeltaFrames: (frames) =>
      set((s) => {
        const next = new Map(s.deltaFrames);
        frames.forEach((f) => next.set(f.ordinal, f));
        const nextState = { ...s, deltaFrames: next };
        return {
          deltaFrames: next,
          ...applyFrameVisuals(nextState),
        };
      }),
    setDeltaMode: (enabled) =>
      set({
        deltaMode: enabled,
        loadedFrames: new Map(),
        deltaFrames: new Map(),
        requestedBlocks: new Set(),
        buildingVisualStates: new Map(),
        frameVersion: 0,
        changedBuildingIds: new Set(),
      }),
    reapplyCurrentFrameVisuals: () => set((s) => applyFrameVisuals(s)),
    restart: () => set(frameMeaningPatch()),
    reset: () =>
      set({
        totalCount: 0,
        loadedFrames: new Map(),
        requestedBlocks: new Set(),
        orderedCommitHashes: [],
        orderedCommitTimestamps: [],
        stableFrame: null,
        currentFrameIndex: 0,
        loadedAgingWindow: 1,
        isPlaying: false,
        deltaFrames: new Map(),
        buildingVisualStates: new Map(),
        frameVersion: 0,
        changedBuildingIds: new Set(),
      }),
  },
}));

export const getCurrentFrame = (): FlatLandscape | null => {
  const { loadedFrames, currentFrameIndex } =
    useEvolutionAnimationStore.getState();
  return loadedFrames.get(currentFrameIndex)?.landscape ?? null;
};
