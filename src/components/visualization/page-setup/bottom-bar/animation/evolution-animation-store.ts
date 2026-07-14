import { FlatLandscape, City, District, Building, AnimationFrame} from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import { create } from 'zustand';




interface EvolutionAnimationState {
  frames: AnimationFrame[];
  stableFrame: FlatLandscape | null;
  fqnToFirstFrame: Map<string, number>;
  currentFrameIndex: number;
  isPlaying: boolean;
  layoutMode: 'city' | 'spiral';
  timeMode: 'commit' | 'time';
  speedMs: number;
  actions: {
    setSkeleton: (skeleton: FlatLandscape) => void;
    setFrames: (frames: AnimationFrame[]) => void;
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
  frames: [],
  stableFrame: null,
  fqnToFirstFrame: new Map(),
  currentFrameIndex: 0,
  isPlaying: false,
  layoutMode: 'spiral',
  timeMode: 'commit',
  speedMs: 1000,
  actions: {
    setSkeleton: (skeleton) => set({ stableFrame: skeleton }),
    setFrames: (frames) => {
      const fqnToFirstFrame = new Map<string, number>();
      frames.forEach((frame) => {
        Object.values(frame.landscape.buildings).forEach((building) => {
          if (building.fqn && !fqnToFirstFrame.has(building.fqn)) {
            fqnToFirstFrame.set(building.fqn, frame.ordinal);
          }
        });
      });
      set({ frames, fqnToFirstFrame, currentFrameIndex: 0, isPlaying: false });
    },

    play: () => set({ isPlaying: true }),
    pause: () => set({ isPlaying: false }),
    stepForward: () =>
      set((s) => ({
        currentFrameIndex: Math.min(
          s.currentFrameIndex + 1,
          s.frames.length - 1
        ),
      })),
    stepBack: () =>
      set((s) => ({
        currentFrameIndex: Math.max(s.currentFrameIndex - 1, 0),
      })),
    seekTo: (index) =>
      set((s) => ({
        currentFrameIndex: Math.max(0, Math.min(index, s.frames.length - 1)),
      })),
    setLayoutMode: (mode: 'city' | 'spiral') => set({ layoutMode: mode }),
    setTimeMode: (mode: 'commit' | 'time') => set({ timeMode: mode }),
    setSpeed: (ms) => set({ speedMs: ms }),
    reset: () => set({ frames: [],stableFrame:null, currentFrameIndex: 0, isPlaying: false }),
  },
}));

export const getCurrentFrame = (): FlatLandscape | null => {
  const { frames, currentFrameIndex } = useEvolutionAnimationStore.getState();
  return frames[currentFrameIndex]?.landscape ?? null;
};
