import { FlatLandscape } from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import { create } from 'zustand';

interface EvolutionAnimationState {
  frames: FlatLandscape[];
  currentFrameIndex: number;
  isPlaying: boolean;
  speedMs: number;
  actions: {
    setFrames: (frames: FlatLandscape[]) => void;
    play: () => void;
    pause: () => void;
    stepForward: () => void;
    stepBack: () => void;
    seekTo: (index: number) => void;
    setSpeed: (ms: number) => void;
    reset: () => void;
  };
}

export const useEvolutionAnimationStore = create<EvolutionAnimationState>(
  (set, get) => ({
    frames: [],
    currentFrameIndex: 0,
    isPlaying: false,
    speedMs: 1000,
    actions: {
      setFrames: (frames) =>
        set({ frames, currentFrameIndex: 0, isPlaying: false }),
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
      setSpeed: (ms) => set({ speedMs: ms }),
      reset: () => set({ frames: [], currentFrameIndex: 0, isPlaying: false }),
    },
  })
);

export const getCurrentFrame = (): FlatLandscape | null => {
  const { frames, currentFrameIndex } = useEvolutionAnimationStore.getState();
  return frames[currentFrameIndex] ?? null;
};
