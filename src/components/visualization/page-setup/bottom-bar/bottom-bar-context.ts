import { MetricOverview } from 'explorviz-frontend/src/utils/landscape-schemes/telemetry/metrics';
import { createContext } from 'react';

export type BottomBarChartView =
  | 'commit-chart'
  | 'runtime-chart'
  | 'runtime-metrics'
  | 'social-metrics';

export type BottomBarState = {
  isExpanded: boolean;
  selectedChart: BottomBarChartView;
  selectedMetric: MetricOverview | null;
};

export type BottomBarActions = {
  setIsExpanded(isExpanded: boolean): void;
  setSelectedChart(chart: BottomBarChartView): void;
  setSelectedMetric(metric: MetricOverview | null): void;
};

export const BottomBarContext = createContext<
  BottomBarState & BottomBarActions
>({
  isExpanded: true,
  selectedChart: 'commit-chart',
  selectedMetric: null,
  setIsExpanded: () => console.error('Bottom bar context provider missing'),
  setSelectedChart: () => console.error('Bottom bar context provider missing'),
  setSelectedMetric: () => console.error('Bottom bar context provider missing'),
});
