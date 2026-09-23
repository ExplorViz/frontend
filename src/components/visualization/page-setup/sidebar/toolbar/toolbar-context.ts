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
};

export type TelemetrySearchState = {
  selectedTab: 'spans' | 'metrics' | 'logs';
  spanSearchRequest: SpanSearchParams | null;
};

export const defaultToolbarState: ToolbarState = {
  showSidebar: false,
  selectedTool: null,
  telemetrySearchState: {
    selectedTab: 'spans',
    spanSearchRequest: null,
  },
};

export const ToolbarContext = createContext<ToolbarState & ToolbarActions>({
  ...defaultToolbarState,
  openTool: () => console.error('Toolbar context provider missing'),
  setTelemetrySearchTab: () =>
    console.error('Toolbar context provider missing'),
  searchSpans: () => console.error('Toolbar context provider missing'),
});
