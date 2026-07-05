import { FlatLandscape, City, District, Building } from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import { create } from 'zustand';




interface EvolutionAnimationState {
  frames: FlatLandscape[];
  stableFrame: FlatLandscape | null;
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
    stableFrame: null,
    fqnToFirstFrame: new Map(),
    currentFrameIndex: 0,
    isPlaying: false,
    layoutMode: 'spiral',
    timeMode: 'commit',
    speedMs: 1000,
    actions: {
      setFrames: (frames) => {
        const fqnToCanonicalId = new Map<string, string>();
        const stableBuildings: Record<string, Building> = {};
        frames.forEach((frame) => {
          Object.values(frame.buildings).forEach((building) => {
            if (building.fqn) {
              if (!fqnToCanonicalId.has(building.fqn)) {
                fqnToCanonicalId.set(building.fqn, building.id);
                stableBuildings[building.id] = building;
              }
            } else {
              stableBuildings[building.id] = building;
            }
          });
        });

        // Helper: translate a frame-local building ID to its canonical stable ID
        const toCanonicalId = (
          frameId: string,
          frame: FlatLandscape
        ): string => {
          const building = frame.buildings[frameId];
          if (building?.fqn)
            return fqnToCanonicalId.get(building.fqn) ?? frameId;
          return frameId;
        };

        const stableCities: Record<string, City> = {};
        frames.forEach((frame) => {
          Object.values(frame.cities).forEach((city) => {
            if (!stableCities[city.id]) {
              stableCities[city.id] = {
                ...city,
                buildingIds: city.buildingIds.map((id) => toCanonicalId(id,frame)),
                allContainedBuildingIds: city.allContainedBuildingIds.map((id) => toCanonicalId(id,frame)),
              };
            } else {
              const existing = stableCities[city.id];
              const canonicalBuildingIds = city.buildingIds.map((id) => toCanonicalId(id,frame));
              const canonicalAllBuildingIds = city.allContainedBuildingIds.map((id) => toCanonicalId(id,frame));
              existing.buildingIds = [
                ...new Set([
                  ...existing.buildingIds,
                  ...canonicalBuildingIds])
              ];
              existing.allContainedBuildingIds = [
                ...new Set([
                  ...existing.allContainedBuildingIds,
                  ...canonicalAllBuildingIds]),
              ];
              existing.districtIds = [
                ...new Set([
                  ...existing.districtIds,
                  ...city.districtIds]),
              ];
              existing.allContainedDistrictIds = [
                ...new Set([
                  ...existing.allContainedDistrictIds,
                  ...city.allContainedDistrictIds]),
              ];
            }
          });
        });

        const stableDistricts: Record<string, District> = {};
        frames.forEach((frame) => {
          Object.values(frame.districts).forEach((district) => {
            if (!stableDistricts[district.id]) {
              stableDistricts[district.id] = {
                ...district,
                buildingIds: district.buildingIds.map((id) => toCanonicalId(id,frame)),
              };
            } else {
              const existing = stableDistricts[district.id];
              const canonicalBuildingIds = district.buildingIds.map((id) => toCanonicalId(id,frame));
              existing.buildingIds = [
                ...new Set([
                  ...existing.buildingIds,
                  ...canonicalBuildingIds]),
              ];
              existing.districtIds = [
                ...new Set([
                  ...existing.districtIds,
                  ...district.districtIds]),
              ];
            }
          });
        });

        const stableFrame: FlatLandscape = {
          ...frames[0],
          buildings: stableBuildings,
          districts: stableDistricts,
          cities: stableCities,
        };

        const fqnToFirstFrame = new Map<string, number>();
        frames.forEach((frame, index) => {
          Object.values(frame.buildings).forEach((building) => {
            if (building.fqn && !fqnToFirstFrame.has(building.fqn)) {
              fqnToFirstFrame.set(building.fqn, index);
            }
          });
        });

        set({
          frames,
          stableFrame,
          fqnToFirstFrame,
          currentFrameIndex: 0,
          isPlaying: false,
        });
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
