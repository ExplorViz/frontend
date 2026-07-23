import { useEffect } from 'react';
import { useEvolutionAnimationStore, WINDOW_SIZE } from './evolution-animation-store';
import { useRenderingServiceStore } from 'explorviz-frontend/src/stores/rendering-service';
import {useEvolutionAnimationFetchServiceStore} from 'explorviz-frontend/src/components/visualization/page-setup/bottom-bar/animation/evolution-animation-fetch-service.ts';
import {useCommitTreeStateStore} from 'explorviz-frontend/src/stores/commit-tree-state.ts';
import { useShallow } from 'zustand/react/shallow';
import { createPortal } from 'react-dom';


export default function EvolutionPlaybackControls() {
  const { loadedFrames, totalCount, stableFrame, currentFrameIndex, isPlaying, speedMs, actions } =
    useEvolutionAnimationStore(
      useShallow((state) => ({
        loadedFrames: state.loadedFrames,
        totalCount: state.totalCount,
        stableFrame: state.stableFrame,
        currentFrameIndex: state.currentFrameIndex,
        isPlaying: state.isPlaying,
        speedMs: state.speedMs,
        actions: state.actions,
      }))
    );

  const repositoryName = useCommitTreeStateStore((s) => s._currentSelectedRepositoryName);
  const fetchWindow = useEvolutionAnimationFetchServiceStore((s) => s.fetchAnimationWindow);

  const triggerRendering = useRenderingServiceStore(
    (state) => state.triggerRenderingForGivenLandscapeData
  );

  useEffect(() => {
    if (totalCount === 0 || !repositoryName) return;

    const ensureBlock = async (block: number) => {
      const start = block * WINDOW_SIZE;
      if (start < 0 || start >= totalCount) return;
      const s = useEvolutionAnimationStore.getState();
      if (s.requestedBlocks.has(block)) return;
      s.actions.markBlockRequested(block);
      const windowData = await fetchWindow(repositoryName, start, WINDOW_SIZE, s.granularity);
      useEvolutionAnimationStore.getState().actions.addFrames(windowData.frames);
    };

    const block = Math.floor(currentFrameIndex / WINDOW_SIZE);
    ensureBlock(block);
    ensureBlock(block + 1);
  }, [currentFrameIndex, totalCount, repositoryName]);

  // Render current frame whenever index changes
  useEffect(() => {
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
      };
    });

    const mergedFrame = {
      ...stableFrame,
      buildings: mergedBuildings,
    };

    triggerRendering(mergedFrame, [], { metrics: {}, communications: [] });
    console.log('Frame 0 building IDs:', Object.keys(frame.buildings).length);
    console.log(
      'stable frame building IDs:',
      Object.keys(stableFrame.buildings).length
    );
  }, [currentFrameIndex, loadedFrames, stableFrame]);

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

  if (totalCount === 0) return null;

  const active = loadedFrames.get(currentFrameIndex);


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
          <code style={{ color: 'blue' }}>{active.commitHash.slice(0, 7)}</code>
          <span style={{ color: '#aaa', marginLeft: '8px' }}>
            {new Date(active.authorDate).toLocaleString()}
          </span>
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
