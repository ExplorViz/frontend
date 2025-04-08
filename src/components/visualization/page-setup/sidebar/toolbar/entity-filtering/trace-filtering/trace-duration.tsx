import React, { useEffect, useRef, useState } from 'react';

import HelpTooltip from 'explorviz-frontend/src/components/help-tooltip';
import eventEmitter from 'explorviz-frontend/src/utils/event-emitter';
import { NEW_SELECTED_TIMESTAMP_EVENT } from 'explorviz-frontend/src/stores/timestamp';
import { DynamicLandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/dynamic-data';
import { useRenderingServiceStore } from 'explorviz-frontend/src/stores/rendering-service';

interface TraceDurationProps {
  readonly traces: DynamicLandscapeData;
  remainingTraceCount: number;
  initialTraceCount: number;
  updateDuration(newMinDuration: number): void;
}

export default function TraceDuration({
  traces,
  remainingTraceCount,
  initialTraceCount,
  updateDuration,
}: TraceDurationProps) {
  const pauseVisualizationUpdating = useRenderingServiceStore(
    (state) => state.pauseVisualizationUpdating
  );

  const [selected, setSelected] = useState<number | null>(null);

  const min = useRef<number>(Number.MAX_VALUE);
  const max = useRef<number>(-1);

  useEffect(() => {
    eventEmitter.on(NEW_SELECTED_TIMESTAMP_EVENT, onTimestampUpdate);
    return () => {
      eventEmitter.off(NEW_SELECTED_TIMESTAMP_EVENT, onTimestampUpdate);
    };
  }, []);

  const durations = (() => {
    if (!selected) {
      for (const trace of traces) {
        min.current =
          trace.duration <= min.current ? trace.duration : min.current;
        max.current =
          trace.duration >= max.current ? trace.duration : max.current;
      }
    }

    return {
      min: min.current,
      max: max.current,
      selected: selected ?? min.current,
    };
  })();

  const onInput = (event: React.FormEvent<HTMLInputElement>) => {
    const newValue = event.currentTarget.value;
    if (newValue) {
      pauseVisualizationUpdating();
      setSelected(Number(newValue));
    }
  };

  const onPointerUp = (event: React.PointerEvent<HTMLInputElement>) => {
    const newSelected = Number(event.currentTarget.value);
    setSelected(newSelected);
    updateDuration(newSelected);
  };

  const onTimestampUpdate = () => {
    // reset state, since new timestamp has been loaded
    setSelected(null);
    min.current = Number.MAX_VALUE;
    max.current = -1;
  };

  return (
    <div className="mb-3">
      <HelpTooltip title="bla" />
      <label className="m-0" htmlFor="filtering-trace-duration">
        Min. duration (# traces:
        <b>
          {remainingTraceCount} / {initialTraceCount}
        </b>
        )
      </label>
      <div className="range-slider--container">
        <div style={{ width: '100%' }}>
          <input
            id="filtering-trace-duration"
            value={durations.selected}
            min={durations.min}
            max={durations.max}
            type="range"
            className="form-control mr-2"
            onPointerUp={onPointerUp}
            onInput={onInput}
          />
          <div className="range-slider--values">
            <span>{durations.min}</span>
            <span style={{ fontWeight: 'bold' }}>{durations.selected}</span>
            <span>{durations.max}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
