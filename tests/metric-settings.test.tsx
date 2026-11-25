// @vitest-environment jsdom
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import MetricSelector from '../src/components/heatmap/heatmap-metric-selector';
import BuildingMetricSettings from '../src/components/visualization/page-setup/sidebar/customizationbar/entity-config/buildings/building-metric-settings';
import Settings from '../src/components/visualization/page-setup/sidebar/customizationbar/settings/settings';
import StructureFiltering from '../src/components/visualization/page-setup/sidebar/toolbar/entity-filtering/structure-filtering/structure-filtering';
import AggregatedBuildingMetricsTable from '../src/components/visualization/rendering/popups/city-popups/aggregated-building-metrics-table';
import { UNBOUNDED_METRIC_RANGE, useEntityFilteringStore } from '../src/stores/entity-filtering-store';
import { BuildingMetricIds, useHeatmapStore } from '../src/stores/heatmap/heatmap-store';
import { useModelStore } from '../src/stores/repos/model-repository';
import { useUserSettingsStore } from '../src/stores/user-settings';
import { getDefaultMetricName } from '../src/utils/evolution-schemes/evolution-data';
import { defaultVizSettings } from '../src/utils/settings/default-settings';
import { getDisabledMetrics, getMetricSettingId, TOGGLEABLE_METRICS } from '../src/utils/settings/metric-settings';
import { BUILDING_METRIC_NAMES, SelectedBuildingMetric } from '../src/utils/settings/settings-schemas';
import { building } from './fixtures/landscape';
import './setup-dom';

const ENABLED_BY_DEFAULT = [
  'cloc',
  'commitCount',
  'cyclomaticComplexity',
  'fileCount',
  'lineCount',
  'size',
  'sloc',
  'unmaintainabilityIndex',
];
const IN_ORDER = ['size', 'lineCount', 'sloc', 'cloc', 'cyclomaticComplexity', 'unmaintainabilityIndex', 'commitCount'];

const settings = () => useUserSettingsStore.getState();
const optionsOf = (element: HTMLElement) =>
  within(element)
    .getAllByRole('option')
    .map(({ textContent }) => textContent);
const landscape = {
  landscapeToken: 'token',
  cities: {},
  districts: {},
  buildings: {
    b: { ...building, id: 'b', metrics: { sloc: { current: 10 }, lcom4: { current: 3 }, custom: { current: 7 } } },
  },
};

function renderSettings() {
  render(<Settings enterFullscreen={() => {}} setGamepadSupport={() => {}} />);
  return within(screen.getByRole('region', { name: 'Metrics' }));
}

beforeEach(() => {
  settings().setVisualizationSettings(structuredClone(defaultVizSettings));
  useEntityFilteringStore.getState().actions.resetFilters();
  useEntityFilteringStore.setState({ baselineFlatLandscape: null });
  useHeatmapStore.getState().cleanup();
  useModelStore.setState({ buildings: landscape.buildings });
});

describe('metric settings', () => {
  it('enable only some metrics by default', () => {
    const disabled = getDisabledMetrics(defaultVizSettings);
    expect(TOGGLEABLE_METRICS.filter((metric) => !disabled.has(metric)).sort()).toEqual(ENABLED_BY_DEFAULT);
  });

  it('exist for every metric of buildings', () => {
    expect(TOGGLEABLE_METRICS).toEqual([...BUILDING_METRIC_NAMES, 'fileCount']);
  });

  it('also apply to settings that were saved without them', () => {
    settings().updateSettings({ buildingMargin: { value: 3 } } as never);
    expect(getDisabledMetrics(settings().visualizationSettings).has('lcom4')).toBe(true);
  });

  it('are toggled in a section of their own', () => {
    const section = renderSettings();
    expect(section.getAllByRole('switch')).toHaveLength(TOGGLEABLE_METRICS.length);
    expect(section.getByRole('switch', { name: 'sloc' })).toBeChecked();
    expect(section.getByRole('switch', { name: 'lcom4' })).not.toBeChecked();

    fireEvent.click(section.getByRole('switch', { name: 'lcom4' }));
    expect(section.getByRole('switch', { name: 'lcom4' })).toBeChecked();
    expect(settings().visualizationSettings.metricLcom4.value).toBe(true);
  });
});

describe('disabled metrics', () => {
  it('are missing in the heatmap until enabled', () => {
    const { rerender } = render(<MetricSelector />);
    expect(optionsOf(screen.getByRole('combobox'))).toEqual(['None', ...IN_ORDER]);

    settings().updateSetting(getMetricSettingId('lcom4'), true);
    rerender(<MetricSelector />);
    expect(optionsOf(screen.getByRole('combobox'))).toContain('lcom4');
  });

  it('are missing in the Building Config', () => {
    render(<BuildingMetricSettings />);
    for (const name of ['Width Metric', 'Depth Metric', 'Height Metric']) {
      expect(optionsOf(screen.getByLabelText(name))).toEqual(['None', ...IN_ORDER]);
    }
  });

  it('are selected correctly in the Building Config', () => {
    render(<BuildingMetricSettings />);
    const select = screen.getByLabelText('Height Metric') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: String(1 + IN_ORDER.indexOf('cyclomaticComplexity')) } });
    expect(settings().visualizationSettings.buildingHeightMetric.value).toBe('cyclomaticComplexity');
  });

  it('are missing in the filters unless they filter', () => {
    const { unmount } = render(<StructureFiltering flatLandscapeData={landscape as never} />);
    expect(screen.getByText('sloc')).toBeInTheDocument();
    expect(screen.queryByText('lcom4')).not.toBeInTheDocument();
    unmount();

    useEntityFilteringStore.getState().actions.setMetricRange('lcom4', { min: 2, max: Infinity });
    render(<StructureFiltering flatLandscapeData={landscape as never} />);
    expect(screen.getByText('lcom4')).toBeInTheDocument();
  });

  it('are missing in popups, other than unknown metrics', () => {
    render(<AggregatedBuildingMetricsTable buildingIds={['b']} />);
    expect(screen.getByText('sloc:')).toBeInTheDocument();
    expect(screen.getByText('custom:')).toBeInTheDocument();
    expect(screen.queryByText('lcom4:')).not.toBeInTheDocument();
  });

  it('are not the default of the commit chart', () => {
    expect(getDefaultMetricName(['cloc', 'lineCount'])).toBe('lineCount');
    expect(getDefaultMetricName(['cloc', 'sloc'])).toBe('cloc');
    expect(getDefaultMetricName([])).toBe('None');
  });

  it('stay selectable while a Snapshot or Room uses them', () => {
    settings().updateSetting('buildingHeightMetric', SelectedBuildingMetric.lcom4);
    render(<BuildingMetricSettings />);
    expect(optionsOf(screen.getByLabelText('Height Metric'))).toContain('lcom4');
    expect(optionsOf(screen.getByLabelText('Width Metric'))).not.toContain('lcom4');
  });
});

describe('disabling a metric that is used', () => {
  const applyMetric = (metric: 'sloc' | 'lcom4') => {
    useHeatmapStore.getState().setSelectedBuildingMetric(BuildingMetricIds[metric]);
    useEntityFilteringStore.getState().actions.setMetricRange(metric, { min: 2, max: Infinity });
    settings().updateSetting('buildingHeightMetric', SelectedBuildingMetric[metric]);
  };
  const usedMetrics = () => ({
    heatmap: useHeatmapStore.getState().selectedBuildingMetric.name,
    height: settings().visualizationSettings.buildingHeightMetric.value,
  });

  it('stops using it', () => {
    applyMetric('sloc');
    settings().updateSetting('buildingWidthMetric', SelectedBuildingMetric.lineCount);

    fireEvent.click(renderSettings().getByRole('switch', { name: 'sloc' }));

    expect(usedMetrics()).toEqual({ heatmap: 'None', height: 'None' });
    expect(useEntityFilteringStore.getState().metricRanges.sloc).toEqual(UNBOUNDED_METRIC_RANGE);
    expect(settings().visualizationSettings.buildingWidthMetric.value).toBe('lineCount');
  });

  it('leaves other disabled metrics in use', () => {
    applyMetric('lcom4');
    fireEvent.click(renderSettings().getByRole('switch', { name: 'sloc' }));
    expect(usedMetrics()).toEqual({ heatmap: 'lcom4', height: 'lcom4' });
  });

  it('also works by resetting the section', () => {
    settings().updateSetting(getMetricSettingId('lcom4'), true);
    applyMetric('lcom4');
    fireEvent.click(renderSettings().getByRole('button', { name: 'Reset Metrics to defaults' }));
    expect(usedMetrics()).toEqual({ heatmap: 'None', height: 'None' });
    expect(useEntityFilteringStore.getState().metricRanges.lcom4).toEqual(UNBOUNDED_METRIC_RANGE);
  });
});
