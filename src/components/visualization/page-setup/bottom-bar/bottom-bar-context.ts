import {
  Building,
  City,
} from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import { MetricOverview } from 'explorviz-frontend/src/utils/landscape-schemes/telemetry/metrics';
import { createContext } from 'react';

export type BottomBarChartView =
  'commit-chart' | 'runtime-chart' | 'runtime-metrics' | 'social-metrics';

export type BottomBarState = {
  isExpanded: boolean;
  selectedChart: BottomBarChartView;
  runtimeMetricsState: RuntimeMetricsState;
};

export type BottomBarActions = {
  setIsExpanded(isExpanded: boolean): void;
  setSelectedChart(chart: BottomBarChartView): void;
  setSelectedMetric(
    metric: MetricOverview | null,
    entity?: Building | City | null
  ): void;
  setSelectedMetricEntity(entity: Building | City | null): void;
};

export type RuntimeMetricsState = {
  selectedMetric: MetricOverview | null;
  selectedEntity: Building | City | null;
};

export const BottomBarContext = createContext<
  BottomBarState & BottomBarActions
>({
  isExpanded: true,
  selectedChart: 'commit-chart',
  runtimeMetricsState: {
    selectedMetric: null,
    selectedEntity: null,
  },
  setIsExpanded: () => console.error('Bottom bar context provider missing'),
  setSelectedChart: () => console.error('Bottom bar context provider missing'),
  setSelectedMetric: () => console.error('Bottom bar context provider missing'),
  setSelectedMetricEntity: () =>
    console.error('Bottom bar context provider missing'),
});
