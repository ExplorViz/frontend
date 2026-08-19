import { useEvolutionAnimationFetchServiceStore } from 'explorviz-frontend/src/components/visualization/page-setup/bottom-bar/animation/evolution-animation-fetch-service.ts';
import { applyAnimationFrameLayout } from 'explorviz-frontend/src/components/visualization/page-setup/bottom-bar/animation/evolution-rendering-setup';
import { useCommitTreeStateStore } from 'explorviz-frontend/src/stores/commit-tree-state.ts';
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useShallow } from 'zustand/react/shallow';
import {
  useEvolutionAnimationStore,
  WINDOW_SIZE,
} from './evolution-animation-store';

export default function EvolutionPlaybackControls() {
  const {
    loadedFrames,
    totalCount,
    stableFrame,
    currentFrameIndex,
    isPlaying,
    speedMs,
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
      deltaMode: state.deltaMode,
      deltaFrames: state.deltaFrames,
      actions: state.actions,
    }))
  );

  const repositoryName = useCommitTreeStateStore(
    (s) => s._currentSelectedRepositoryName
  );
  const fetchWindow = useEvolutionAnimationFetchServiceStore(
    (s) => s.fetchAnimationWindow
  );

  const fetchDeltaWindow = useEvolutionAnimationFetchServiceStore(
    (s) => s.fetchAnimationDeltaWindow
  );

  const initialLayoutDoneRef = useRef(false);

  useEffect(() => {
    if (totalCount === 0) {
      initialLayoutDoneRef.current = false;
    }
  }, [totalCount, stableFrame]);

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
          s.bucketSize
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
  }, [
    currentFrameIndex,
    totalCount,
    repositoryName,
    deltaMode,
    fetchDeltaWindow,
    fetchWindow,
  ]);

  // One-time frame layout after animation starts; skeleton layout is applied on load.
  useEffect(() => {
    if (!stableFrame || totalCount === 0 || initialLayoutDoneRef.current) {
      return;
    }

    applyAnimationFrameLayout();
    initialLayoutDoneRef.current = true;
  }, [
    stableFrame,
    totalCount,
    loadedFrames,
    deltaFrames,
    deltaMode,
    currentFrameIndex,
  ]);

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
      <button
        onClick={actions.stepBack}
        disabled={currentFrameIndex === 0}
        style={btnStyle}
      >
        Back
      </button>

      <button
        onClick={isPlaying ? actions.pause : actions.play}
        style={btnStyle}
      >
        {isPlaying ? 'Pause' : 'Play'}
      </button>

      <button
        onClick={actions.stepForward}
        disabled={currentFrameIndex === totalCount - 1}
        style={btnStyle}
      >
        Forward
      </button>

      <span style={{ fontSize: '13px', color: '#aaa' }}>
        {currentFrameIndex + 1} / {totalCount}
      </span>

      <input
        type="range"
        min={0}
        max={totalCount - 1}
        value={currentFrameIndex}
        onChange={(e) => actions.seekTo(Number(e.target.value))}
        style={{ width: '225px' }}
      />

      <button
        onClick={() => {
          actions.reset();
        }}
        style={{ ...btnStyle, marginLeft: '8px', color: '#aaa' }}
      >
        Close
      </button>

      {active && (
        <div style={{ fontSize: '12px', marginTop: '8px' }}>
          <div>
            <code style={{ color: 'blue' }}>
              {active.commitHash.slice(0, 7)}
            </code>
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
