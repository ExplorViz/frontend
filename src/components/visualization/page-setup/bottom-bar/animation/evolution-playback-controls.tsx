import { useEffect } from 'react';
import { useEvolutionAnimationStore } from './evolution-animation-store';
import { useRenderingServiceStore } from 'explorviz-frontend/src/stores/rendering-service';
import { useShallow } from 'zustand/react/shallow';
import { createPortal } from 'react-dom';


export default function EvolutionPlaybackControls() {
  const { frames, currentFrameIndex, isPlaying, speedMs, actions } =
    useEvolutionAnimationStore(
      useShallow((state) => ({
        frames: state.frames,
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
    if (!frame) {
      return;
    }
    triggerRendering(frame, [], { metrics: {}, communications: [] });

    // Check what the store has after the call
    setTimeout(() => {
      const landscapeData = useRenderingServiceStore.getState()._landscapeData;
      console.log(
        'LandscapeData in store after render:',
        landscapeData?.flatLandscapeData?.buildings
          ? Object.values(landscapeData.flatLandscapeData.buildings)
              .filter((b: any) => b.commitComparison)
              .slice(0, 3)
              .map((b: any) => ({
                name: b.name,
                comparison: b.commitComparison,
              }))
          : 'no buildings'
      );
    }, 100);
  }, [currentFrameIndex, frames]);

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
        top: '150px',
        left: '20px',
        backgroundColor: '#1a1a1a',
        border: '1px solid #444',
        borderRadius: '8px',
        padding: '16px',
        width: '220px',
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
        ⏮
      </button>

      {/* Play/Pause */}
      <button
        onClick={isPlaying ? actions.pause : actions.play}
        style={btnStyle}
      >
        {isPlaying ? '⏸' : '▶'}
      </button>

      {/* Step forward */}
      <button
        onClick={actions.stepForward}
        disabled={currentFrameIndex === frames.length - 1}
        style={btnStyle}
      >
        ⏭
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
        style={{ width: '150px' }}
      />

      {/* Close */}
      <button
        onClick={() => {
          actions.reset();
        }}
        style={{ ...btnStyle, marginLeft: '8px', color: '#aaa' }}
      >
        ✕
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
