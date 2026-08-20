import { useEvolutionAnimationFetchServiceStore } from 'explorviz-frontend/src/components/visualization/page-setup/bottom-bar/animation/evolution-animation-fetch-service.ts';
import { applyAnimationFrameLayout } from 'explorviz-frontend/src/components/visualization/page-setup/bottom-bar/animation/evolution-rendering-setup';
import { useCommitTreeStateStore } from 'explorviz-frontend/src/stores/commit-tree-state.ts';
import { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useShallow } from 'zustand/react/shallow';
import {
  useEvolutionAnimationStore,
  WINDOW_SIZE,
} from './evolution-animation-store';
import Form from 'react-bootstrap/Form';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  PauseIcon,
  PlayIcon,
  XIcon
} from '@primer/octicons-react';
import {
  useFloatingPanel,
  FloatingPanelPosition,
  } from 'explorviz-frontend/src/components/visualization/page-setup/bottom-bar/animation/floating-panel.ts';
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
  const anchorNextToPanel = useCallback((): FloatingPanelPosition | null => {
    const panel = document.querySelector('.evolution-animation-panel');
    if (panel) {
      const rect = panel.getBoundingClientRect();
      return { left: rect.right + 8, top: rect.top };
    }
    const toolSidebar = document.getElementById('toolsSidebarButtonContainer');
    if (toolSidebar) {
      const rect = toolSidebar.getBoundingClientRect();
      return { left: rect.right + 8, top: rect.top };
    }
    const tools = document.querySelector('.sidebar-tools-button');
    if (tools) {
      const rect = tools.getBoundingClientRect();
      return { left: rect.left, top: rect.bottom + 8 };
    }
    return null;
  }, []);

  const { ref, isMinimized, toggleMinimized, onDragStart } = useFloatingPanel(
    anchorNextToPanel,
    8
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
      className={`evolution-playback-controls${
        isMinimized ? ' evolution-playback-controls--minimized' : ''
      }`}
      ref={ref}
    >
      <div
        className="evolution-playback-controls__transport"
        onPointerDown={onDragStart}
      >
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary evolution-playback-controls__button"
          onClick={actions.stepBack}
          disabled={currentFrameIndex === 0}
          title="Frame Back"
          aria-label="Frame Ahead"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <ChevronLeftIcon size="small" verticalAlign="middle" />
        </button>

        <button
          type="button"
          className="btn btn-sm btn-primary evolution-playback-controls__button"
          onClick={isPlaying ? actions.pause : actions.play}
          title={isPlaying ? 'Pause' : 'Play'}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {isPlaying ? (
            <PauseIcon size="small" verticalAlign="middle" />
          ) : (
            <PlayIcon size="small" verticalAlign="middle" />
          )}
        </button>

        <button
          type="button"
          className="btn btn-sm btn-outline-secondary evolution-playback-controls__button"
          onClick={actions.stepForward}
          disabled={currentFrameIndex === totalCount - 1}
          title="Step Ahead"
          aria-label="Step Ahead"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <ChevronRightIcon size="small" verticalAlign="middle" />
        </button>

        <span className="evolution-playback-controls__grip" />

        <button
          type="button"
          className="btn evolution-playback-controls__icon-button"
          onClick={toggleMinimized}
          title={isMinimized ? 'Maximize' : 'Minimize'}
          aria-label={isMinimized ? 'Maximize' : 'Minimize'}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <ChevronUpIcon
            size="small"
            className={isMinimized ? '' : 'hide-bottom-bar-icon-down'}
          />
        </button>

        <button
          type="button"
          className="btn evolution-playback-controls__icon-button"
          aria-label="Stop Animation"
          title="Stop Animation"
          onClick={actions.reset}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <XIcon size="small" verticalAlign="middle" />
        </button>
      </div>

      <Form.Range
        className="evolution-playback-controls__slider"
        min={0}
        max={totalCount - 1}
        value={currentFrameIndex}
        onChange={(e) => actions.seekTo(Number(e.target.value))}
      />

      <div className="evolution-playback-controls__hash-row">
        <code className="evolution-playback-controls__hash">
          {active ? active.commitHash.slice(0, 7) : '—'}
        </code>
        <span className="evolution-playback-controls__counter">
          {currentFrameIndex + 1} / {totalCount}
        </span>
      </div>

      <div className="evolution-playback-controls__range">
        {activeDelta
          ? `${
              activeDelta.tsFrom === activeDelta.tsTo
                ? new Date(activeDelta.tsFrom).toLocaleDateString()
                : `${new Date(activeDelta.tsFrom).toLocaleDateString()} – ${new Date(
                    activeDelta.tsTo
                  ).toLocaleDateString()}`
            } · ${
              activeDelta.commitCount === 0
                ? 'No Commits'
                : `${activeDelta.commitCount} Commit${
                    activeDelta.commitCount === 1 ? '' : 's'
                  }`
            }`
          : active && new Date(active.authorDate).toLocaleString()}
      </div>
    </div>,
    document.body
  );
};
