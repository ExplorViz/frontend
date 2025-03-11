import React, { useEffect, useRef, useState } from 'react';

import HelpTooltip from 'react-lib/src/components/help-tooltip';
import { Class } from 'react-lib/src/utils/landscape-schemes/structure-data';
import { NEW_SELECTED_TIMESTAMP_EVENT } from 'react-lib/src/stores/timestamp';
import eventEmitter from 'react-lib/src/utils/event-emitter';

interface ClassMethodFilteringProps {
  readonly classes: Class[];
  remainingEntityCountAfterFiltering: number;
  initialEntityCount: number;
  updateMinMethodCount(newValue: number): void;
  pauseVisualizationUpdating(): void;
}

export default function ClassMethodFiltering({
  classes,
  remainingEntityCountAfterFiltering,
  initialEntityCount,
  updateMinMethodCount,
  pauseVisualizationUpdating,
}: ClassMethodFilteringProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const min = useRef<number>(Number.MAX_VALUE);
  const max = useRef<number>(-1);

  const classesStats = (() => {
    if (!selected) {
      for (const clazz of classes) {
        const methodCount = clazz.methods.length;

        min.current = Math.min(methodCount, min.current);
        max.current = Math.max(methodCount, max.current);
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
    updateMinMethodCount(newSelected);
  };

  const onTimestampUpdate = () => {
    // reset state, since new timestamp has been loaded
    setSelected(null);
    min.current = Number.MAX_VALUE;
    max.current = -1;
  };

  useEffect(() => {
    eventEmitter.on(NEW_SELECTED_TIMESTAMP_EVENT, onTimestampUpdate);
    return () => {
      eventEmitter.off(NEW_SELECTED_TIMESTAMP_EVENT, onTimestampUpdate);
    };
  }, []);

  return (
    <div className="mb-3">
      <HelpTooltip title="bla" />
      <label className="m-0" htmlFor="filtering-class-method">
        Min. # methods (# classes:
        <b>
          {remainingEntityCountAfterFiltering}/{initialEntityCount}
        </b>
        )
      </label>
      <div className="range-slider--container">
        <div style={{ width: '100%' }}>
          <input
            id="filtering-class-method"
            value={classesStats.selected}
            min={classesStats.min}
            max={classesStats.max}
            type="range"
            step="1"
            className="form-control mr-2"
            onChange={onChange}
            onInput={onInput}
          />
          <div className="range-slider--values">
            <span>{classesStats.min}</span>
            <span style={{ fontWeight: 'bold' }}>{classesStats.selected}</span>
            <span>{classesStats.max}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
