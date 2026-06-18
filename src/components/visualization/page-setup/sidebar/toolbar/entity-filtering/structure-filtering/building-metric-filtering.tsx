import React, { forwardRef, useImperativeHandle } from 'react';

import HelpTooltip from 'explorviz-frontend/src/components/help-tooltip';
import { useRenderingServiceStore } from 'explorviz-frontend/src/stores/rendering-service';
import { sortBuildingMetricNames } from 'explorviz-frontend/src/utils/settings/settings-schemas';

interface BuildingMetricFilteringProps {
  metricBounds: Record<string, { min: number; max: number }>;
  selectedMetricThresholds: Record<string, number>;
  updateMetricThreshold: (metric: string, value: number) => void;
  remainingEntityCountAfterFiltering: number;
  initialEntityCount: number;
}

export type BuildingMetricFilteringHandle = {
  setFunctionCountValue: (value: number) => void;
  reset: () => void;
};

const BuildingMetricFiltering = forwardRef<
  BuildingMetricFilteringHandle,
  BuildingMetricFilteringProps
>(function BuildingMetricFiltering(
  {
    metricBounds,
    selectedMetricThresholds,
    updateMetricThreshold,
    remainingEntityCountAfterFiltering,
    initialEntityCount,
  },
  ref
) {
  const pauseVisualizationUpdating = useRenderingServiceStore(
    (state) => state.pauseVisualizationUpdating
  );

  const onInput = (
    event: React.FormEvent<HTMLInputElement>,
    metricName: string
  ) => {
    const newValue = Number(event.currentTarget.value);
    pauseVisualizationUpdating();
    updateMetricThreshold(metricName, newValue);
  };

  const onPointerUp = (
    event: React.PointerEvent<HTMLInputElement>,
    metricName: string
  ) => {
    const newSelected = Number(event.currentTarget.value);
    updateMetricThreshold(metricName, newSelected);
  };

  useImperativeHandle(ref, () => ({
    setFunctionCountValue: (value: number) => {
      updateMetricThreshold('functionCount', value);
    },
    reset: () => {
      Object.entries(metricBounds).forEach(([metricName, bounds]) => {
        updateMetricThreshold(metricName, bounds.min);
      });
    },
  }));

  return (
    <div className="mb-3">
      <HelpTooltip title="bla" />
      <label className="m-0" htmlFor="filtering-building-metric-functionCount">
        Min. metric values (# buildings:
        <b>
          {remainingEntityCountAfterFiltering}/{initialEntityCount}
        </b>
        )
      </label>
      {sortBuildingMetricNames(Object.keys(metricBounds)).map((metricName) => {
        const bounds = metricBounds[metricName];
        const selected = selectedMetricThresholds[metricName] ?? bounds.min;
        return (
          <div
            key={metricName}
            className="range-slider--container my-2 d-flex align-items-start gap-2"
          >
            <label
              className="m-0 text-end"
              htmlFor={`filtering-building-metric-${metricName}`}
              style={{ width: '140px', paddingTop: '2px' }}
            >
              {metricName}
            </label>
            <div style={{ width: '100%' }}>
              <input
                id={`filtering-building-metric-${metricName}`}
                value={selected}
                min={bounds.min}
                max={bounds.max}
                type="range"
                step="1"
                className="form-control mr-2"
                onPointerUp={(event) => onPointerUp(event, metricName)}
                onInput={(event) => onInput(event, metricName)}
              />
              <div className="range-slider--values">
                <span>{bounds.min}</span>
                <span style={{ fontWeight: 'bold' }}>{selected}</span>
                <span>{bounds.max}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
});

export default BuildingMetricFiltering;
