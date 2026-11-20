import React, { useEffect, useImperativeHandle, useState } from 'react';

import DualRangeSlider from 'explorviz-frontend/src/components/dual-range-slider';
import { formatWithUpToTwoDecimals } from 'explorviz-frontend/src/components/visualization/rendering/popups/city-popups/building-metrics-utils';
import { MetricRange, UNBOUNDED_METRIC_RANGE } from 'explorviz-frontend/src/stores/entity-filtering-store';
import { sortBuildingMetricNames } from 'explorviz-frontend/src/utils/settings/settings-schemas';

type MetricBounds = { min: number; max: number };

interface BuildingMetricFilteringProps {
  metricBounds: Record<string, MetricBounds>;
  selectedMetricRanges: Record<string, MetricRange>;
  /** Applies a range to the city. Expensive: may rebuild and re-render the landscape. */
  updateMetricRange: (metric: string, range: MetricRange) => void;
  /** Shows a range in the controls and building count while dragging, without applying it to the city. */
  previewMetricRange: (metric: string, range: MetricRange) => void;
  remainingEntityCountAfterFiltering: number;
  initialEntityCount: number;
}

export type BuildingMetricFilteringHandle = {
  setFunctionCountValue: (value: number) => void;
  reset: () => void;
};

const isNormalizedMetricBounds = (bounds: MetricBounds) => bounds.min === 0 && bounds.max <= 1;

const getMetricStep = (bounds: MetricBounds) => (isNormalizedMetricBounds(bounds) ? 0.01 : 1);

/** Clamps a dialed or typed value into the bounds and snaps it to the metric's step. */
const snapMetricValue = (value: number, bounds: MetricBounds) => {
  const clamped = Math.min(bounds.max, Math.max(bounds.min, value));
  // Rounding via toFixed avoids float noise such as 0.29000000000000004 from step snapping.
  return isNormalizedMetricBounds(bounds) ? Number(clamped.toFixed(2)) : Math.round(clamped);
};

/**
 * Turns two dialed values into a stored range. An upper bound at the largest
 * value in the landscape is stored as unbounded, so the filter does not start
 * excluding buildings once a later landscape contains larger values.
 */
const toMetricRange = (lower: number, upper: number, bounds: MetricBounds): MetricRange => {
  const [min, max] = [snapMetricValue(lower, bounds), snapMetricValue(upper, bounds)].sort((a, b) => a - b);
  return { min, max: max >= bounds.max ? Number.POSITIVE_INFINITY : max };
};

const BuildingMetricFiltering = function BuildingMetricFiltering({
  ref,
  metricBounds,
  selectedMetricRanges,
  updateMetricRange,
  previewMetricRange,
  remainingEntityCountAfterFiltering,
  initialEntityCount,
}: BuildingMetricFilteringProps & {
  ref?: React.RefObject<BuildingMetricFilteringHandle | null>;
}) {
  useImperativeHandle(ref, () => ({
    setFunctionCountValue: (value: number) => {
      const range = selectedMetricRanges.functionCount ?? UNBOUNDED_METRIC_RANGE;
      updateMetricRange('functionCount', { ...range, min: value });
    },
    reset: () => {
      Object.entries(metricBounds).forEach(([metricName, bounds]) => {
        updateMetricRange(metricName, { min: bounds.min, max: Number.POSITIVE_INFINITY });
      });
    },
  }));

  return (
    <div className="mb-3">
      <label className="m-0">
        Metric value ranges (# buildings:
        <b>
          {remainingEntityCountAfterFiltering}/{initialEntityCount}
        </b>
        )
      </label>
      <div className="building-metric-filter-grid">
        {sortBuildingMetricNames(Object.keys(metricBounds)).map((metricName, index) => {
          const bounds = metricBounds[metricName];
          const range = selectedMetricRanges[metricName] ?? UNBOUNDED_METRIC_RANGE;
          const lower = Math.min(bounds.max, Math.max(bounds.min, range.min));
          const upper = Math.min(bounds.max, Math.max(bounds.min, range.max));
          const rowStart = index * 2 + 1;

          return (
            <React.Fragment key={metricName}>
              <span className="building-metric-filter-label" style={{ gridColumn: 1, gridRow: `${rowStart} / span 2` }}>
                {metricName}
              </span>
              <div className="building-metric-filter-slider" style={{ gridColumn: '2 / 4', gridRow: rowStart }}>
                <DualRangeSlider
                  min={bounds.min}
                  max={bounds.max}
                  step={getMetricStep(bounds)}
                  value={[lower, upper]}
                  // A slider without any span would divide by zero when placing its thumbs.
                  disabled={bounds.max <= bounds.min}
                  onChange={([newLower, newUpper]) =>
                    previewMetricRange(metricName, toMetricRange(newLower, newUpper, bounds))
                  }
                  onChangeEnd={([newLower, newUpper]) =>
                    updateMetricRange(metricName, toMetricRange(newLower, newUpper, bounds))
                  }
                  getTooltipText={formatWithUpToTwoDecimals}
                />
              </div>
              <MetricBoundInput
                className="building-metric-filter-value building-metric-filter-value--min"
                ariaLabel={`${metricName} minimum`}
                value={lower}
                bounds={bounds}
                style={{ gridColumn: 2, gridRow: rowStart + 1 }}
                onCommit={(value) => updateMetricRange(metricName, toMetricRange(value, upper, bounds))}
              />
              <MetricBoundInput
                className="building-metric-filter-value building-metric-filter-value--max"
                ariaLabel={`${metricName} maximum`}
                value={upper}
                bounds={bounds}
                style={{ gridColumn: 3, gridRow: rowStart + 1 }}
                onCommit={(value) => updateMetricRange(metricName, toMetricRange(lower, value, bounds))}
              />
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

interface MetricBoundInputProps {
  className: string;
  ariaLabel: string;
  value: number;
  bounds: MetricBounds;
  style: React.CSSProperties;
  onCommit: (value: number) => void;
}

/**
 * Number field for one end of a metric range. Keeps the typed text as a draft
 * and only applies it on blur or Enter, so intermediate input such as an empty
 * field does not refilter the whole city on every keystroke.
 */
function MetricBoundInput({ className, ariaLabel, value, bounds, style, onCommit }: MetricBoundInputProps) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => setDraft(String(value)), [value]);

  const commit = () => {
    const parsed = Number(draft);
    if (draft.trim() === '' || !Number.isFinite(parsed)) {
      setDraft(String(value));
      return;
    }
    onCommit(parsed);
    // The committed value may be clamped, snapped or swapped with the other bound.
    setDraft(String(value));
  };

  return (
    <input
      className={`${className} form-control`}
      type="number"
      min={bounds.min}
      max={bounds.max}
      step={getMetricStep(bounds)}
      value={draft}
      aria-label={ariaLabel}
      style={style}
      onChange={(event) => setDraft(event.currentTarget.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          commit();
        }
      }}
    />
  );
}

export default BuildingMetricFiltering;
