import React, { useEffect, useState, useRef } from 'react';

import { NEW_SELECTED_TIMESTAMP_EVENT } from 'explorviz-frontend/src/stores/timestamp';
import { DynamicLandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/dynamic-data';
import eventEmitter from 'explorviz-frontend/src/utils/event-emitter';
import HelpTooltip from 'explorviz-frontend/src/components/help-tooltip';
import { useRenderingServiceStore } from 'explorviz-frontend/src/stores/rendering-service';

interface TraceStartProps {
  readonly traces: DynamicLandscapeData;
  remainingTraceCount: number;
  initialTraceCount: number;
  updateStartTimestamp(newMinStartTimestamp: number): void;
}

export default function TraceStart({
  traces,
  remainingTraceCount,
  initialTraceCount,
  updateStartTimestamp,
}: TraceStartProps) {
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

  const timestamps = (() => {
    if (!selected) {
      for (const trace of traces) {
        min.current =
          trace.startTime <= min.current ? trace.startTime : min.current;
        max.current =
          trace.startTime >= max.current ? trace.startTime : max.current;
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
    updateStartTimestamp(newSelected);
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
      <label className="m-0" htmlFor="filtering-trace-start">
        Min. start timestamp (# traces:
        <b>
          {remainingTraceCount} / {initialTraceCount}
        </b>
        )
      </label>
      <div className="range-slider--container">
        <div style={{ width: '100%' }}>
          <input
            id="filtering-trace-start"
            value={timestamps.selected!}
            min={timestamps.min}
            max={timestamps.max}
            type="range"
            step="1000"
            className="form-control mr-2"
            onPointerUp={onPointerUp}
            onInput={onInput}
          />
          <div className="range-slider--values">
            <span>{formatTimestampToDate(timestamps.min)}</span>
            <span style={{ fontWeight: 'bold' }}>
              {formatTimestampToDate(timestamps.selected!)}
            </span>
            <span>{formatTimestampToDate(timestamps.max)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatTimestampToDate(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString();
}
