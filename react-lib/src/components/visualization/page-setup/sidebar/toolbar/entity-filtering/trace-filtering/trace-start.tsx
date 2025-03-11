import React, { useEffect, useState, useRef } from 'react';

import { NEW_SELECTED_TIMESTAMP_EVENT } from 'react-lib/src/stores/timestamp';
import { DynamicLandscapeData } from 'react-lib/src/utils/landscape-schemes/dynamic/dynamic-data';
import eventEmitter from 'react-lib/src/utils/event-emitter';
import HelpTooltip from 'react-lib/src/components/help-tooltip';

interface TraceStartProps {
  readonly traces: DynamicLandscapeData;
  remainingTraceCount: number;
  initialTraceCount: number;
  updateStartTimestamp(newMinStartTimestamp: number): void;
  pauseVisualizationUpdating(): void;
}

export default function TraceStart({
  traces,
  remainingTraceCount,
  initialTraceCount,
  updateStartTimestamp,
  pauseVisualizationUpdating,
}: TraceStartProps) {
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

  const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newSelected = Number(event.target.value);
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
            onChange={onChange}
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
