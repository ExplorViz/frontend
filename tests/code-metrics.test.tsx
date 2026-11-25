// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AggregatedBuildingMetricsTable from '../src/components/visualization/rendering/popups/city-popups/aggregated-building-metrics-table';
import {
  accumulateBuildingMetrics,
  formatAggregatedMetric,
  formatMetricDifference,
  formatMetricValue,
} from '../src/components/visualization/rendering/popups/city-popups/building-metrics-utils';
import BuildingMetricFiltering from '../src/components/visualization/page-setup/sidebar/toolbar/entity-filtering/structure-filtering/building-metric-filtering';
import { UNBOUNDED_METRIC_RANGE, useEntityFilteringStore } from '../src/stores/entity-filtering-store';
import { BuildingMetricIds, ORDERED_BUILDING_METRIC_IDS, useHeatmapStore } from '../src/stores/heatmap/heatmap-store';
import { useModelStore } from '../src/stores/repos/model-repository';
import { compileBuildingFilter } from '../src/utils/city-rendering/building-filter';
import {
  getAvailableMetricNames,
  normalizeCommitNode,
  type Branch,
  type CommitNode,
} from '../src/utils/evolution-schemes/evolution-data';
import {
  buildBranchChartSeries,
  getMetricLabel,
  getMetricValue,
  hasAverageMetric,
} from '../src/utils/evolution-data-helpers';
import { getMetricValues } from '../src/utils/heatmap/building-heatmap-helper';
import type { Building } from '../src/utils/landscape-schemes/flat-landscape';
import { BUILDING_CONFIG_METRIC_OPTIONS } from '../src/utils/settings/building-config-settings';
import { getMetricMappingMultiplier } from '../src/utils/settings/building-metrics';
import { BuildingMetricMapping, SelectedBuildingMetric } from '../src/utils/settings/settings-schemas';
import { building } from './fixtures/landscape';
import './setup-dom';

/** Keys of the code analyzer, see its docs/code-metrics.md. */
const CODE_METRICS = [
  'cyclomatic_complexity',
  'cyclomatic_complexity_weighted',
  'npath_complexity',
  'nestedBlockDepth',
  'LCOM4',
  'unmaintainability_index',
];

describe.each(CODE_METRICS)('code metric %s', (metric) => {
  const buildings = {
    low: { ...building, id: 'low', metrics: { [metric]: { current: 2 } } },
    high: { ...building, id: 'high', metrics: { [metric]: { current: 8 } } },
  };

  beforeEach(() => {
    useModelStore.setState({ buildings });
  });

  it('can be mapped to the dimensions of buildings', () => {
    expect(BUILDING_CONFIG_METRIC_OPTIONS).toContain(metric);
    for (const mapping of Object.values(BuildingMetricMapping)) {
      expect(getMetricMappingMultiplier(metric as SelectedBuildingMetric, mapping)).toBeGreaterThan(0);
    }
  });

  it('can be shown in the heatmap', () => {
    expect(ORDERED_BUILDING_METRIC_IDS).toContain(metric);
    useHeatmapStore.getState().setSelectedBuildingMetric(metric as BuildingMetricIds);

    const selected = useHeatmapStore.getState().selectedBuildingMetric;
    expect(selected).toMatchObject({ name: metric, min: 2, max: 8 });
    expect(getMetricValues(buildings.high, selected)).toEqual({ min: 2, max: 8, current: 8 });
    expect(getMetricValues(building, selected).current).toBeNull();
  });

  it('can be filtered', () => {
    expect(useEntityFilteringStore.getState().metricRanges[metric]).toEqual(UNBOUNDED_METRIC_RANGE);
    const filter = compileBuildingFilter({
      filterMode: 'Remove',
      hiddenModelTypes: new Set(),
      hiddenLanguages: new Set(),
      inclusionExpressions: [],
      exclusionExpressions: [],
      metricRanges: { [metric]: { min: 5, max: Infinity } },
    });
    expect(filter.isFiltered(buildings.low)).toBe(true);
    expect(filter.isFiltered(buildings.high)).toBe(false);
  });

  it('is available in the commit chart', () => {
    const branch = {
      commits: [{ hash: 'a', hasAccumulatedMetrics: true, metrics: { lineCount: 1, [metric]: 2 } }],
    } as unknown as Branch;
    expect(getAvailableMetricNames(branch)).toContain(metric);
  });
});

describe('values of code metrics', () => {
  it('shows decimals of fractional metrics only', () => {
    expect(formatMetricValue('unmaintainability_index', 28.4838)).toBe('28.48');
    expect(formatMetricValue('cyclomatic_complexity_weighted', 1.75)).toBe('1.75');
    expect(formatMetricValue('npath_complexity', 1000.4)).toBe('1,000');
  });
});

describe('range filter of fractional metrics', () => {
  const metric = 'unmaintainability_index';

  function renderFilter(max: number) {
    const updateMetricRange = vi.fn();
    render(
      <BuildingMetricFiltering
        metricBounds={{ [metric]: { min: 0, max } }}
        selectedMetricRanges={{}}
        updateMetricRange={updateMetricRange}
        previewMetricRange={vi.fn()}
        remainingEntityCountAfterFiltering={1}
        initialEntityCount={1}
      />
    );
    const commitMinimum = (value: string) => {
      const input = screen.getByLabelText(`${metric} minimum`);
      fireEvent.change(input, { target: { value } });
      fireEvent.blur(input);
    };
    return { updateMetricRange, commitMinimum };
  }

  it('keeps decimals', () => {
    const { updateMetricRange, commitMinimum } = renderFilter(34.567);
    commitMinimum('12.345');
    expect(updateMetricRange).toHaveBeenLastCalledWith(metric, { min: 12.35, max: Infinity });
  });

  it('does not exclude the largest value by rounding', () => {
    const { updateMetricRange, commitMinimum } = renderFilter(34.567);
    commitMinimum('99');
    expect(updateMetricRange).toHaveBeenLastCalledWith(metric, { min: 34.567, max: Infinity });
  });
});

describe('sum and average of commits', () => {
  const commit = (hash: string, metrics: object, metricFileCounts?: object) =>
    normalizeCommitNode({ hash, hasAccumulatedMetrics: true, metrics, metricFileCounts } as CommitNode);
  const analyzed = commit('a', { sloc: 300, unused: 0, fileCount: 10 }, { sloc: 4, unused: 0 });
  const legacy = commit('b', { sloc: 100 });
  const branchOf = (...commits: CommitNode[]): Branch => ({
    name: 'main',
    branchPoint: { name: 'NONE', commit: '' },
    commits,
  });

  it('averages over the files that have the metric', () => {
    expect(getMetricValue(analyzed, 'sloc')).toBe(300);
    expect(getMetricValue(analyzed, 'sloc', 'average')).toBe(75);
  });

  it.each(['unused', 'fileCount', 'unknown'])('has no average for %s', (metric) => {
    expect(getMetricValue(analyzed, metric, 'average')).toBeNull();
    expect(hasAverageMetric(branchOf(analyzed), metric)).toBe(false);
  });

  it('has no average for commits without file counts', () => {
    expect(getMetricValue(legacy, 'sloc', 'average')).toBeNull();
    expect(hasAverageMetric(branchOf(legacy), 'sloc')).toBe(false);
    expect(hasAverageMetric(branchOf(legacy, analyzed), 'sloc')).toBe(true);
  });

  it('applies to the chart and its filter for metric changes', () => {
    const grown = commit('c', { sloc: 600 }, { sloc: 8 });
    const branch = branchOf(legacy, analyzed, grown);
    const valuesOf = (aggregation: 'sum' | 'average', metricChangeThreshold = 0) =>
      buildBranchChartSeries(branch, 'equidistant', 'sloc', { aggregation, metricChangeThreshold }).yValues;

    expect(valuesOf('sum')).toEqual([100, 300, 600]);
    expect(valuesOf('average')).toEqual([null, 75, 75]);
    expect(valuesOf('sum', 250)).toEqual([300, 600]);
    expect(valuesOf('average', 250)).toEqual([null, 75]);
  });

  it('labels averages', () => {
    expect(getMetricLabel('sloc', 'sum')).toBe('sloc');
    expect(getMetricLabel('sloc', 'average')).toBe('sloc (avg)');
  });
});

describe('sum and average of buildings', () => {
  const accumulate = (...metrics: NonNullable<Building['metrics']>[]) => {
    const buildings = metrics.map((value, index) => ({ ...building, id: `b${index}`, metrics: value }));
    useModelStore.setState({ buildings: Object.fromEntries(buildings.map((value) => [value.id, value])) });
    return accumulateBuildingMetrics(buildings.map(({ id }) => id));
  };

  it('averages over the buildings that have the metric', () => {
    const { sloc } = accumulate(
      { sloc: { current: 2000 } },
      { sloc: { current: 0 } },
      { size: { current: 1 } },
      {
        sloc: { current: null },
      }
    );
    expect(sloc.current).toEqual({ sum: 2000, average: 1000 });
    expect(sloc.previous).toBeUndefined();
  });

  it('considers the buildings of each commit in a comparison', () => {
    const { sloc } = accumulate(
      { sloc: { current: 10, previous: 20 } },
      { sloc: { current: 30 } },
      { sloc: { current: null, previous: 60 } }
    );
    expect(sloc).toEqual({ current: { sum: 40, average: 20 }, previous: { sum: 80, average: 40 } });
  });

  it('reads values that the server sends as strings', () => {
    const { sloc } = accumulate(...([{ sloc: { current: '9.0' } }, { sloc: { current: '1.0' } }] as never[]));
    expect(sloc.current).toEqual({ sum: 10, average: 5 });
  });

  it('formats the average behind the sum', () => {
    expect(formatAggregatedMetric('sloc', { sum: 2092, average: 82.04 })).toBe('2,092 (82 avg)');
    expect(formatAggregatedMetric('LCOM4', { sum: 14, average: 1.4 })).toBe('14 (1.4 avg)');
    expect(formatAggregatedMetric('unmaintainability_index', { sum: 110.5, average: 36.8333 })).toBe(
      '110.5 (36.83 avg)'
    );
    expect(formatAggregatedMetric('size', { sum: 4096, average: 2048 })).toBe('4 KiloBytes (2 KiloBytes avg)');
    expect(formatAggregatedMetric('sloc', undefined)).toBe('—');
  });

  it('formats differences with the precision of the metric', () => {
    expect(formatMetricDifference('sloc', 12)).toBe('+12');
    expect(formatMetricDifference('unmaintainability_index', -0.4)).toBe('-0.4');
  });

  it('is shown in the table of districts and foundations', () => {
    accumulate(
      { sloc: { current: 10, previous: 20 }, cloc: { current: 4, previous: 4 } },
      { sloc: { current: 30, previous: 10 }, cloc: { current: 8, previous: 8 } }
    );
    render(<AggregatedBuildingMetricsTable buildingIds={['b0', 'b1']} />);

    expect(screen.getByText('12 (6 avg)')).toBeInTheDocument();
    expect(screen.getByText('+10')).toBeInTheDocument();
    expect(screen.getByText('(C1: 30 (15 avg), C2: 40 (20 avg))')).toBeInTheDocument();
  });
});
