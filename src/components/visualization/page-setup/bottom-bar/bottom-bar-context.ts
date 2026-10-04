import { createContext } from 'react';

export type BottomBarChartView =
  | 'commit-chart'
  | 'runtime-chart'
  | 'runtime-metrics'
  | 'social-metrics';

export type BottomBarState = {
  isExpanded: boolean;
  selectedChart: BottomBarChartView;
};

export type BottomBarActions = {
  setIsExpanded(isExpanded: boolean): void;
  setSelectedChart(chart: BottomBarChartView): void;
};

export const BottomBarContext = createContext<
  BottomBarState & BottomBarActions
>({
  isExpanded: true,
  selectedChart: 'commit-chart',
  setIsExpanded: () => console.error('Bottom bar context provider missing'),
  setSelectedChart: () => console.error('Bottom bar context provider missing'),
});
