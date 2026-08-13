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

  const clampMetricValue = (
    value: number,
    bounds: { min: number; max: number }
  ) => {
    if (!Number.isFinite(value)) {
      return bounds.min;
    }
    return Math.min(bounds.max, Math.max(bounds.min, Math.round(value)));
  };

  const onValueInput = (
    event: React.FormEvent<HTMLInputElement>,
    metricName: string
  ) => {
    const newValue = Number(event.currentTarget.value);
    if (!Number.isFinite(newValue)) {
      return;
    }
    pauseVisualizationUpdating();
    updateMetricThreshold(metricName, newValue);
  };

  const onValueBlur = (
    event: React.FocusEvent<HTMLInputElement>,
    metricName: string,
    bounds: { min: number; max: number }
  ) => {
    const newValue = clampMetricValue(
      Number(event.currentTarget.value),
      bounds
    );
    updateMetricThreshold(metricName, newValue);
  };

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
      <div className="building-metric-filter-grid">
        {sortBuildingMetricNames(Object.keys(metricBounds)).map(
          (metricName, index) => {
            const bounds = metricBounds[metricName];
            const selected = selectedMetricThresholds[metricName] ?? bounds.min;
            const rowStart = index * 2 + 1;

            return (
              <React.Fragment key={metricName}>
                <label
                  className="building-metric-filter-label m-0"
                  htmlFor={`filtering-building-metric-${metricName}`}
                  style={{ gridColumn: 1, gridRow: `${rowStart} / span 2` }}
                >
                  {metricName}
                </label>
                <input
                  id={`filtering-building-metric-${metricName}`}
                  value={selected}
                  min={bounds.min}
                  max={bounds.max}
                  type="range"
                  step="1"
                  className="building-metric-filter-slider form-control"
                  style={{ gridColumn: '2 / 5', gridRow: rowStart }}
                  onPointerUp={(event) => onPointerUp(event, metricName)}
                  onInput={(event) => onInput(event, metricName)}
                />
                <span
                  className="building-metric-filter-bound building-metric-filter-bound--min"
                  style={{ gridColumn: 2, gridRow: rowStart + 1 }}
                >
                  {bounds.min}
                </span>
                <input
                  className="building-metric-filter-value form-control"
                  type="number"
                  min={bounds.min}
                  max={bounds.max}
                  step="1"
                  value={selected}
                  aria-label={`${metricName} threshold`}
                  style={{ gridColumn: 3, gridRow: rowStart + 1 }}
                  onChange={(event) => onValueInput(event, metricName)}
                  onBlur={(event) => onValueBlur(event, metricName, bounds)}
                />
                <span
                  className="building-metric-filter-bound building-metric-filter-bound--max"
                  style={{ gridColumn: 4, gridRow: rowStart + 1 }}
                >
                  {bounds.max}
                </span>
              </React.Fragment>
            );
          }
        )}
      </div>
    </div>
  );
});

export default BuildingMetricFiltering;
