import React, { useState } from 'react';

interface TraceSpeedProps {
  callback: (speed: number) => void;
}

export default function TraceSpeed({ callback }: TraceSpeedProps) {
  const min = 0.1;
  const max = 100;
  const step = 0.1;

  const [speed, setSpeed] = useState<number>(5);

  const handleInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(event.target.value);
    if (!isNaN(value)) {
      setSpeed(Math.min(Math.max(value, min), max));
      callback(Math.min(Math.max(value, min), max));
    }
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(event.target.value);
    setSpeed(Math.min(Math.max(value, min), max));
    callback(Math.min(Math.max(value, min), max));
  };

  return (
    <div className="range-slider--container">
      <div style={{ width: '100%' }}>
        <label htmlFor="trace-speed-slider">Playback speed</label>
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
