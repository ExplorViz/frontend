import { LogSearchParams } from 'explorviz-frontend/src/hooks/fetch/useLogFetch';
import { MetricsSearchParams } from 'explorviz-frontend/src/hooks/fetch/useMetricsFetch';
import { SpanSearchParams } from 'explorviz-frontend/src/hooks/fetch/useSpanFetch';
import { createContext } from 'react';

export enum ToolbarTool {
  Filter = 'Filter',
  EntitySearch = 'Entity Search',
  TracePlayer = 'Trace Player',
  TelemetrySearch = 'Telemetry Search',
  RepositoryAnalysis = 'Repo Analysis',
  KubernetesDiagrams = 'Kubernetes Diagrams',
}

export type ToolbarState = {
  showSidebar: boolean;
  selectedTool: ToolbarTool | null;
  telemetrySearchState: TelemetrySearchState;
};

export type ToolbarActions = {
  openTool(tool: ToolbarTool | null): void;
  setTelemetrySearchTab(tab: 'spans' | 'metrics' | 'logs'): void;
  searchSpans(searchParams: SpanSearchParams): void;
  searchMetrics(searchParams: MetricsSearchParams): void;
  searchLogs(searchParams: LogSearchParams): void;
};

export type TelemetrySearchState = {
  selectedTab: 'spans' | 'metrics' | 'logs';
  spanSearchRequest: SpanSearchParams | null;
  metricsSearchRequest: MetricsSearchParams | null;
  logSearchRequest: LogSearchParams | null;
};

export const defaultToolbarState: ToolbarState = {
  showSidebar: false,
  selectedTool: null,
  telemetrySearchState: {
    selectedTab: 'spans',
    spanSearchRequest: null,
    metricsSearchRequest: null,
    logSearchRequest: null,
  },
};

export const ToolbarContext = createContext<ToolbarState & ToolbarActions>({
  ...defaultToolbarState,
  openTool: () => console.error('Toolbar context provider missing'),
  setTelemetrySearchTab: () =>
    console.error('Toolbar context provider missing'),
  searchSpans: () => console.error('Toolbar context provider missing'),
  searchMetrics: () => console.error('Toolbar context provider missing'),
  searchLogs: () => console.error('Toolbar context provider missing'),
});
