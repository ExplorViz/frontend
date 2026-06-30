import { FlatLandscape } from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import { create } from 'zustand';




interface EvolutionAnimationState {
  frames: FlatLandscape[];
  masterFrame: FlatLandscape | null;
  fqnToFirstFrame: Map<string, number>;
  currentFrameIndex: number;
  isPlaying: boolean;
  layoutMode: 'city' | 'spiral';
  timeMode: 'commit' | 'time';
  speedMs: number;
  actions: {
    setFrames: (frames: FlatLandscape[]) => void;
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

export const useEvolutionAnimationStore = create<EvolutionAnimationState>(
  (set, get) => ({
    frames: [],
    masterFrame: null,
    fqnToFirstFrame: new Map(),
    currentFrameIndex: 0,
    isPlaying: false,
    layoutMode: 'spiral',
    timeMode: 'commit',
    speedMs: 1000,
    actions: {
      setFrames: (frames) =>{
        const masterFrame: FlatLandscape | null =
          frames.length === 0
            ? null
            : {
                ...frames[0],
                buildings: Object.assign({}, ...frames.map((f) => f.buildings)),
                districts: Object.assign({}, ...frames.map((f) => f.districts)),
                cities: Object.assign({}, ...frames.map((f) => f.cities)),
              };

        const fqnToFirstFrame = new Map<string, number>();
        frames.forEach((frame, index) => {
          Object.values(frame.buildings).forEach((building) => {
            if (building.fqn && !fqnToFirstFrame.has(building.fqn)) {
              fqnToFirstFrame.set(building.fqn, index);
            }
          });
        });

        set({ frames, masterFrame, fqnToFirstFrame ,currentFrameIndex: 0, isPlaying: false });
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
      setLayoutMode: (mode: 'city' |'spiral') => set({layoutMode: mode}),
      setTimeMode: (mode: 'commit' | 'time' ) => set({timeMode: mode}),
      setSpeed: (ms) => set({ speedMs: ms }),
      reset: () => set({ frames: [], currentFrameIndex: 0, isPlaying: false }),
    },
  })
);

export const getCurrentFrame = (): FlatLandscape | null => {
  const { frames, currentFrameIndex } = useEvolutionAnimationStore.getState();
  return frames[currentFrameIndex] ?? null;
};
