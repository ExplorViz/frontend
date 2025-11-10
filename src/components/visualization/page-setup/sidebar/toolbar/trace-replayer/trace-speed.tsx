import { useTraceReplayStore } from 'explorviz-frontend/src/stores/trace-replay';
import React from 'react';
import { useShallow } from 'zustand/react/shallow';

export default function TraceSpeed() {
  const min = 0.1;
  const max = 100;
  const step = 0.1;

  const { speed, setSpeed } = useTraceReplayStore(
    useShallow((state) => ({
      speed: state.speed,
      setSpeed: state.setSpeed,
    }))
  );

  const handleInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(event.target.value);
    if (!isNaN(value)) {
      setSpeed(Math.min(Math.max(value, min), max));
    }
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(event.target.value);
    setSpeed(Math.min(Math.max(value, min), max));
  };

  return (
    <div className="range-slider--container">
      <div style={{ width: '100%' }}>
        <label htmlFor="trace-speed-slider">Playback Speed</label>
        <input
          id="trace-speed-slider"
          value={speed}
          min={min}
          max={max}
          type="range"
          step={step}
          className="form-control mr-2"
          onChange={handleChange}
          onInput={handleInput}
        />
        <div className="range-slider--values">
          <span>{min}</span>
          <span style={{ fontWeight: 'bold' }}>{speed}</span>
          <span>{max}</span>
        </div>
      </div>
    </div>
  );
}
