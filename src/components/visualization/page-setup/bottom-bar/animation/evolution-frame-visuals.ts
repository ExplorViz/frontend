import { decodeDeltaFrame } from 'explorviz-frontend/src/components/visualization/page-setup/bottom-bar/animation/evolution-delta-decoder';
import {
  AnimationDeltaFrame,
  AnimationFrame,
  Building,
  CommitComparison,
  FlatLandscape,
} from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';

export type EvolutionBuildingVisualState = {
  isPlaceholder: boolean;
  commitComparison?: CommitComparison;
  agingFactor?: number;
};

export type EvolutionFrameVisualInput = {
  currentFrameIndex: number;
  stableFrame: FlatLandscape | null;
  loadedFrames: Map<number, AnimationFrame>;
  deltaFrames: Map<number, AnimationDeltaFrame>;
  deltaMode: boolean;
  agingEnabled: boolean;
  agingCommits: number;
  agingMs: number;
  timeMode: 'commit' | 'time';
};

export function computeEvolutionFrameVisuals(
  input: EvolutionFrameVisualInput
): Map<string, EvolutionBuildingVisualState> | null {
  const { stableFrame, currentFrameIndex } = input;
  if (!stableFrame) return null;

  if (input.deltaMode) {
    const decoded = decodeDeltaFrame(input.deltaFrames, currentFrameIndex);
    if (!decoded) return null;

    const currentDate =
      input.deltaFrames.get(currentFrameIndex)?.authorDate ?? 0;
    const visuals = new Map<string, EvolutionBuildingVisualState>();

    Object.keys(stableFrame.buildings).forEach((id) => {
      const fqn = stableFrame.buildings[id].fqn;
      const fileState = fqn ? decoded.get(fqn) : undefined;

      let agingFactor: number | undefined;
      if (fileState && input.agingEnabled) {
        const raw =
          input.timeMode === 'time'
            ? (currentDate - fileState.lastChangeDate) / input.agingMs
            : (currentFrameIndex - fileState.lastChangeIndex) /
              input.agingCommits;
        agingFactor = Math.min(1, Math.max(0, raw));
      }

      visuals.set(id, {
        isPlaceholder: !fileState,
        commitComparison: fileState?.action,
        agingFactor,
      });
    });

    return visuals;
  }

  const active = input.loadedFrames.get(currentFrameIndex);
  const frame = active?.landscape;
  if (!frame) return null;

  const currentFrameByFqn = new Map<string, Building>();
  Object.values(frame.buildings).forEach((building) => {
    if (building.fqn) currentFrameByFqn.set(building.fqn, building);
  });

  const agingFactorByFqn = new Map<string, number>();
  if (input.agingEnabled) {
    const currentTs = active.authorDate ?? 0;
    const lastChangeByFqn = new Map<string, number>();
    for (let i = currentFrameIndex; i >= 0; i--) {
      const past = input.loadedFrames.get(i);
      if (!past) continue;
      if (input.timeMode === 'time') {
        if (currentTs - past.authorDate > input.agingMs) break;
      } else if (currentFrameIndex - i > input.agingCommits) {
        break;
      }
      Object.values(past.landscape.buildings).forEach((b) => {
        if (!b.fqn || lastChangeByFqn.has(b.fqn)) return;
        if (
          b.commitComparison === 'ADDED' ||
          b.commitComparison === 'MODIFIED'
        ) {
          lastChangeByFqn.set(b.fqn, i);
        }
      });
    }
    currentFrameByFqn.forEach((_b, fqn) => {
      const changeIdx = lastChangeByFqn.get(fqn);
      let factor: number;
      if (changeIdx === undefined) {
        factor = 1;
      } else if (input.timeMode === 'time') {
        const changeTs =
          input.loadedFrames.get(changeIdx)?.authorDate ?? currentTs;
        factor = Math.min(
          1,
          Math.max(0, (currentTs - changeTs) / input.agingMs)
        );
      } else {
        factor = Math.min(
          1,
          Math.max(0, (currentFrameIndex - changeIdx) / input.agingCommits)
        );
      }
      agingFactorByFqn.set(fqn, factor);
    });
  }

  const visuals = new Map<string, EvolutionBuildingVisualState>();
  Object.keys(stableFrame.buildings).forEach((id) => {
    const fqn = stableFrame.buildings[id].fqn;
    const currentBuilding = fqn
      ? currentFrameByFqn.get(fqn)
      : frame.buildings[id];
    const existsInCurrentFrame = !!currentBuilding;

    visuals.set(id, {
      isPlaceholder: !existsInCurrentFrame,
      commitComparison: existsInCurrentFrame
        ? (currentBuilding?.commitComparison ?? 'UNCHANGED')
        : undefined,
      agingFactor:
        existsInCurrentFrame && input.agingEnabled && fqn
          ? (agingFactorByFqn.get(fqn) ?? 0)
          : undefined,
    });
  });

  return visuals;
}

export function mergeEvolutionVisualStates(
  previous: Map<string, EvolutionBuildingVisualState>,
  next: Map<string, EvolutionBuildingVisualState>,
  frameVersion: number
): {
  buildingVisualStates: Map<string, EvolutionBuildingVisualState>;
  frameVersion: number;
  changed: boolean;
  changedBuildingIds: Set<string>;
} {
  const changedBuildingIds = new Set<string>();
  let changed = next.size !== previous.size;

  for (const [id, visual] of next) {
    const prev = previous.get(id);
    if (
      !prev ||
      prev.isPlaceholder !== visual.isPlaceholder ||
      prev.commitComparison !== visual.commitComparison ||
      prev.agingFactor !== visual.agingFactor
    ) {
      changed = true;
      changedBuildingIds.add(id);
    }
  }

  if (!changed) {
    return {
      buildingVisualStates: previous,
      frameVersion,
      changed: false,
      changedBuildingIds: new Set(),
    };
  }

  return {
    buildingVisualStates: new Map(next),
    frameVersion: frameVersion + 1,
    changed: true,
    changedBuildingIds,
  };
}

export function buildMergedFlatLandscape(
  input: EvolutionFrameVisualInput
): FlatLandscape | null {
  const { stableFrame } = input;
  if (!stableFrame) return null;

  const visuals = computeEvolutionFrameVisuals(input);
  if (!visuals) return null;

  const mergedBuildings = { ...stableFrame.buildings };
  visuals.forEach((visual, id) => {
    mergedBuildings[id] = { ...mergedBuildings[id], ...visual };
  });

  return { ...stableFrame, buildings: mergedBuildings };
}
