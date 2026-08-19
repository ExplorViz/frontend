import { useEffect } from 'react';
import { useEvolutionAnimationStore, WINDOW_SIZE } from './evolution-animation-store';
import { useRenderingServiceStore } from 'explorviz-frontend/src/stores/rendering-service';
import {useEvolutionAnimationFetchServiceStore} from 'explorviz-frontend/src/components/visualization/page-setup/bottom-bar/animation/evolution-animation-fetch-service.ts';
import {useCommitTreeStateStore} from 'explorviz-frontend/src/stores/commit-tree-state.ts';
import {decodeDeltaFrame} from 'explorviz-frontend/src/components/visualization/page-setup/bottom-bar/animation/evolution-delta-decoder.ts';
import { useShallow } from 'zustand/react/shallow';
import { createPortal } from 'react-dom';


export default function EvolutionPlaybackControls() {
  const {
    loadedFrames,
    totalCount,
    stableFrame,
    currentFrameIndex,
    isPlaying,
    speedMs,
    timeMode,
    agingEnabled,
    agingCommits,
    agingMs,
    deltaMode,
    deltaFrames,
    actions,
  } = useEvolutionAnimationStore(
    useShallow((state) => ({
      loadedFrames: state.loadedFrames,
      totalCount: state.totalCount,
      stableFrame: state.stableFrame,
      currentFrameIndex: state.currentFrameIndex,
      isPlaying: state.isPlaying,
      speedMs: state.speedMs,
      timeMode: state.timeMode,
      agingEnabled: state.agingEnabled,
      agingCommits: state.agingCommits,
      agingMs: state.agingMs,
      deltaMode: state.deltaMode,
      deltaFrames: state.deltaFrames,
      actions: state.actions,
    }))
  );

  const repositoryName = useCommitTreeStateStore((s) => s._currentSelectedRepositoryName);
  const fetchWindow = useEvolutionAnimationFetchServiceStore((s) => s.fetchAnimationWindow);

  const triggerRendering = useRenderingServiceStore(
    (state) => state.triggerRenderingForGivenLandscapeData
  );
  const fetchDeltaWindow = useEvolutionAnimationFetchServiceStore(
    (s) => s.fetchAnimationDeltaWindow
  );

  useEffect(() => {
    if (totalCount === 0 || !repositoryName) return;

    const ensureBlock = async (block: number) => {
      const start = block * WINDOW_SIZE;
      if (start < 0 || start >= totalCount) return;
      const s = useEvolutionAnimationStore.getState();
      if (s.requestedBlocks.has(block)) return;
      s.actions.markBlockRequested(block);
      if (s.deltaMode) {
        const windowData = await fetchDeltaWindow(
          repositoryName,
          start,
          WINDOW_SIZE,
          s.granularity,
          s.timeMode,
          s.bucketSize,
          s.loadedAgingWindow,
          s.rangeFrom,
          s.rangeTo
        );
        useEvolutionAnimationStore
          .getState()
          .actions.addDeltaFrames(windowData.frames);
      } else {
        const windowData = await fetchWindow(
          repositoryName,
          start,
          WINDOW_SIZE,
          s.granularity,
          s.timeMode,
          s.bucketSize
        );
        useEvolutionAnimationStore
          .getState()
          .actions.addFrames(windowData.frames);
      }
    };
    const block = Math.floor(currentFrameIndex / WINDOW_SIZE);
    ensureBlock(block);
    ensureBlock(block + 1);
  }, [currentFrameIndex, totalCount, repositoryName, deltaMode]);

  // Render current frame whenever index changes
  useEffect(() => {
    if (deltaMode) return;
    const active = loadedFrames.get(currentFrameIndex);
    const frame = active?.landscape;
    if (!frame || !stableFrame) return;


    //Build Fqn map for the visibility
    const currentFrameByFqn = new Map<
      string,
      (typeof frame.buildings)[string]
    >();
    Object.values(frame.buildings).forEach((building) => {
      if (building.fqn) currentFrameByFqn.set(building.fqn, building);
    });

    // Aging: for each file (by fqn) find how long ago it was last ADDED/MODIFIED,
    // scanning backwards over the loaded frames within the configured threshold.
    // Commit mode counts frames, time mode compares author timestamps.
    // Result per fqn: agingFactor in [0,1] (0 = just changed, 1 = fully aged).
    const agingFactorByFqn = new Map<string, number>();
    if (agingEnabled) {
      const currentTs = active?.authorDate ?? 0;
      const lastChangeByFqn = new Map<string, number>(); // fqn -> change frame index
      for (let i = currentFrameIndex; i >= 0; i--) {
        const past = loadedFrames.get(i);
        if (!past) continue;
        // Stop once we leave the lookback window
        if (timeMode === 'time') {
          if (currentTs - past.authorDate > agingMs) break;
        } else if (currentFrameIndex - i > agingCommits) {
          break;
        }
        Object.values(past.landscape.buildings).forEach((b) => {
          if (!b.fqn || lastChangeByFqn.has(b.fqn)) return;
          if (b.commitComparison === 'ADDED' || b.commitComparison === 'MODIFIED') {
            lastChangeByFqn.set(b.fqn, i);
          }
        });
      }
      currentFrameByFqn.forEach((_b, fqn) => {
        const changeIdx = lastChangeByFqn.get(fqn);
        let factor: number;
        if (changeIdx === undefined) {
          factor = 1; // no change found within the window → fully aged
        } else if (timeMode === 'time') {
          const changeTs = loadedFrames.get(changeIdx)?.authorDate ?? currentTs;
          factor = Math.min(1, Math.max(0, (currentTs - changeTs) / agingMs));
        } else {
          factor = Math.min(1, Math.max(0, (currentFrameIndex - changeIdx) / agingCommits));
        }
        agingFactorByFqn.set(fqn, factor);
      });
    }

    const mergedBuildings = { ...stableFrame.buildings };
    Object.keys(mergedBuildings).forEach((id) => {
      const fqn = mergedBuildings[id].fqn;
      const currentBuilding = fqn
        ? currentFrameByFqn.get(fqn)
        : frame.buildings[id];
      const existsInCurrentFrame = !!currentBuilding;

      mergedBuildings[id] = {
        ...mergedBuildings[id],
        isPlaceholder: !existsInCurrentFrame,
        commitComparison: existsInCurrentFrame
          ? currentBuilding?.commitComparison
          ?? 'UNCHANGED'
          : undefined,
        agingFactor:
          existsInCurrentFrame && agingEnabled && fqn
            ? agingFactorByFqn.get(fqn) ?? 0
            : undefined,
      };
    });

    const mergedFrame = {
      ...stableFrame,
      buildings: mergedBuildings,
    };

    triggerRendering(mergedFrame, [], { metrics: {}, communications: [] });
  }, [
    currentFrameIndex,
    loadedFrames,
    stableFrame,
    timeMode,
    agingEnabled,
    agingCommits,
    agingMs,
    deltaMode,
  ]);

    // Delta mode: decode keyframe + deltas, then merge onto the stable skeleton
    useEffect(() => {
      if (!deltaMode || !stableFrame) return;
      const decoded = decodeDeltaFrame(deltaFrames, currentFrameIndex);
      if (!decoded) return;

      const currentDate = deltaFrames.get(currentFrameIndex)?.authorDate ?? 0;
      const mergedBuildings = { ...stableFrame.buildings };

      Object.keys(mergedBuildings).forEach((id) => {
        const fqn = mergedBuildings[id].fqn;
        const fileState = fqn ? decoded.get(fqn) : undefined;

        let agingFactor: number | undefined;
        if (fileState && agingEnabled) {
          const raw =
            timeMode === 'time'
              ? (currentDate - fileState.lastChangeDate) / agingMs
              : (currentFrameIndex - fileState.lastChangeIndex) / agingCommits;
          agingFactor = Math.min(1, Math.max(0, raw));
        }

        mergedBuildings[id] = {
          ...mergedBuildings[id],
          isPlaceholder: !fileState,
          commitComparison: fileState?.action,
          agingFactor,
        };
      });
      triggerRendering({ ...stableFrame, buildings: mergedBuildings }, [], {
        metrics: {},
        communications: [],
      });

    }, [
      deltaMode,
      deltaFrames,
      currentFrameIndex,
      stableFrame,
      timeMode,
      agingEnabled,
      agingCommits,
      agingMs,
    ]);
  // Auto-advance timer
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      const state = useEvolutionAnimationStore.getState();
      if (state.currentFrameIndex >= state.totalCount - 1) {
        state.actions.pause();
      } else {
        state.actions.stepForward();
      }
    }, speedMs);
    return () => clearInterval(interval);
  }, [isPlaying, speedMs]);

  useEffect(() => {
    if (!stableFrame) return;
    if (deltaMode ? deltaFrames.size > 0 : loadedFrames.size > 0) return;

    const placeholders = { ...stableFrame.buildings };
    Object.keys(placeholders).forEach((id) => {
      placeholders[id] = {
        ...placeholders[id],
        isPlaceholder: true,
        commitComparison: undefined,
        agingFactor: undefined,
      };
    });

    triggerRendering({ ...stableFrame, buildings: placeholders }, [], {
      metrics: {},
      communications: [],
    });
  }, [stableFrame, deltaMode, deltaFrames, loadedFrames]);

  if (totalCount === 0) return null;

  const active = deltaMode
    ? deltaFrames.get(currentFrameIndex)
    : loadedFrames.get(currentFrameIndex);
  const activeDelta = deltaMode
    ? deltaFrames.get(currentFrameIndex)
    : undefined;


  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: '150px',
        left: '260px',
        backgroundColor: '#1a1a1a',
        border: '1px solid #444',
        borderRadius: '8px',
        padding: '16px',
        width: '300px',
        zIndex: 9999,
        color: 'white',
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
      }}
    >
      {/* Step back */}
      <button
        onClick={actions.stepBack}
        disabled={currentFrameIndex === 0}
        style={btnStyle}
      >
        Back
      </button>

      {/* Play/Pause */}
      <button
        onClick={isPlaying ? actions.pause : actions.play}
        style={btnStyle}
      >
        {isPlaying ? 'Pause' : 'Play'}
      </button>

      {/* Step forward */}
      <button
        onClick={actions.stepForward}
        disabled={currentFrameIndex === totalCount - 1}
        style={btnStyle}
      >
        Forward
      </button>

      {/* Frame counter */}
      <span style={{ fontSize: '13px', color: '#aaa' }}>
        {currentFrameIndex + 1} / {totalCount}
      </span>

      {/* Timeline scrubber */}
      <input
        type="range"
        min={0}
        max={totalCount - 1}
        value={currentFrameIndex}
        onChange={(e) => actions.seekTo(Number(e.target.value))}
        style={{ width: '225px' }}
      />

      {/* Close */}
      <button
        onClick={() => {
          actions.reset();
        }}
        style={{ ...btnStyle, marginLeft: '8px', color: '#aaa' }}
      >
        Close
      </button>

      {/* Current commit */}
      {active && (
        <div style={{ fontSize: '12px', marginTop: '8px' }}>
          <div>
            <code style={{ color: 'blue' }}>{active.commitHash.slice(0, 7)}</code>
            <span style={{ color: '#aaa', marginLeft: '8px' }}>
              {new Date(active.authorDate).toLocaleString()}
            </span>
          </div>
          {activeDelta && (
            <div style={{ color: '#aaa', marginTop: '4px' }}>
              {activeDelta.tsFrom === activeDelta.tsTo
                ? new Date(activeDelta.tsFrom).toLocaleDateString()
                : `${new Date(activeDelta.tsFrom).toLocaleDateString()} – ${new Date(
                  activeDelta.tsTo
                ).toLocaleDateString()}`}
              <span style={{ marginLeft: '8px' }}>
                {activeDelta.commitCount === 0
                  ? '· keine Commits'
                  : `· ${activeDelta.commitCount} Commit${
                    activeDelta.commitCount === 1 ? '' : 's'
                  }`}
              </span>
            </div>
          )}
        </div>
      )}
    </div>,
    document.body
  );
}

const btnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'white',
  cursor: 'pointer',
  fontSize: '18px',
  padding: '2px 6px',
};
