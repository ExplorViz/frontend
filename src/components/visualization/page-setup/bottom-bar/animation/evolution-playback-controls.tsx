import { useEffect } from 'react';
import { useEvolutionAnimationStore } from './evolution-animation-store';
import { useRenderingServiceStore } from 'explorviz-frontend/src/stores/rendering-service';
import { useShallow } from 'zustand/react/shallow';
import { createPortal } from 'react-dom';


export default function EvolutionPlaybackControls() {
  const { frames, stableFrame, currentFrameIndex, isPlaying, speedMs, actions } =
    useEvolutionAnimationStore(
      useShallow((state) => ({
        frames: state.frames,
        stableFrame: state.stableFrame,
        currentFrameIndex: state.currentFrameIndex,
        isPlaying: state.isPlaying,
        speedMs: state.speedMs,
        actions: state.actions,
      }))
    );

  const triggerRendering = useRenderingServiceStore(
    (state) => state.triggerRenderingForGivenLandscapeData
  );

  // Render current frame whenever index changes
  useEffect(() => {
    const active = frames[currentFrameIndex];
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
  }, [currentFrameIndex, frames, stableFrame]);

  // Auto-advance timer
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      const { currentFrameIndex, frames } =
        useEvolutionAnimationStore.getState();
      if (currentFrameIndex >= frames.length - 1) {
        useEvolutionAnimationStore.getState().actions.pause();
      } else {
        useEvolutionAnimationStore.getState().actions.stepForward();
      }
    }, speedMs);
    return () => clearInterval(interval);
  }, [isPlaying, speedMs]);

  if (frames.length === 0) return null;

  const active = frames[currentFrameIndex];

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: '500px',
        left: '20px',
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
        disabled={currentFrameIndex === frames.length - 1}
        style={btnStyle}
      >
        Forward
      </button>

      {/* Frame counter */}
      <span style={{ fontSize: '13px', color: '#aaa' }}>
        {currentFrameIndex + 1} / {frames.length}
      </span>

      {/* Timeline scrubber */}
      <input
        type="range"
        min={0}
        max={frames.length - 1}
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
          <code style={{ color: 'blue' }}>
            {active.commitHash.slice(0, 7)}
          </code>
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
