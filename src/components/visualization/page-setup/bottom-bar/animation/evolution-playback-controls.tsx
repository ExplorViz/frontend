import { useEffect } from 'react';
import { useEvolutionAnimationStore } from './evolution-animation-store';
import { useRenderingServiceStore } from 'explorviz-frontend/src/stores/rendering-service';
import { useShallow } from 'zustand/react/shallow';
import { createPortal } from 'react-dom';


export default function EvolutionPlaybackControls() {
  const { frames, masterFrame, currentFrameIndex, isPlaying, speedMs, actions } =
    useEvolutionAnimationStore(
      useShallow((state) => ({
        frames: state.frames,
        masterFrame: state.masterFrame,
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
    const frame = frames[currentFrameIndex];
    //masterFrame = frame with all buildings
    if (!frame || !masterFrame) return;

    const mergedBuildings = {...masterFrame.buildings};
    Object.keys(mergedBuildings).forEach((id) => {
      const existsInCurrentFrame = !!frame.buildings[id];

      mergedBuildings[id] = {
        ...mergedBuildings[id],
          isPlaceholder: !existsInCurrentFrame,
        commitComparison: existsInCurrentFrame
              ? frame.buildings[id].commitComparison ?? undefined
              : undefined,
      };
    });

    const mergedFrame = {
      ...masterFrame,
      buildings: mergedBuildings,
    };

    triggerRendering(mergedFrame, [], { metrics: {}, communications: [] });
    console.log('Frame 0 building IDs:', Object.keys(frame.buildings).length);
    console.log(
      'Master frame building IDs:',
      Object.keys(masterFrame.buildings).length
    );
  }, [currentFrameIndex, frames, masterFrame]);

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
