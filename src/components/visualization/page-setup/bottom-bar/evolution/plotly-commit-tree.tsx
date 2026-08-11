import LinkButton from 'explorviz-frontend/src/components/link-button.tsx';
import CommitChartSearch from 'explorviz-frontend/src/components/visualization/page-setup/bottom-bar/evolution/commit-chart-search';
import CommitStatisticsWindow from 'explorviz-frontend/src/components/visualization/page-setup/bottom-bar/evolution/commit-statistics-window';
import { useCommitTreeStateStore } from 'explorviz-frontend/src/stores/commit-tree-state';
import {
  addCommitToSelection,
  branchHasAnalyzedCommits,
  buildBranchChartLineSegments,
  buildBranchChartSeries,
  formatCommitDate,
  getFirstBranchWithCommits,
  getMetricValue,
  hasSkippedCommitsBetweenVisiblePoints,
  removeFilteredCommitsFromSelection,
  toggleCommitInSelection,
} from 'explorviz-frontend/src/utils/evolution-data-helpers';
import {
  Commit,
  CommitNode,
  CommitXAxisPlacement,
  CROSS_COMMIT_IDENTIFIER,
  getAvailableMetricNames,
  getDefaultMetricName,
  NONE_METRIC,
  RepoNameCommitTreeMap,
} from 'explorviz-frontend/src/utils/evolution-schemes/evolution-data';
import {
  buildCommitChartLinkUrl,
  getCommitChartLinkLabel,
  getCommitChartLinkTooltip,
} from 'explorviz-frontend/src/utils/repository-file-url';
import Plotly from 'plotly.js-dist';
import { useEffect, useMemo, useRef, useState } from 'react';
import Button from 'react-bootstrap/Button';

interface PlotlyCommitTreeArgs {
  repoNameCommitTreeMap: RepoNameCommitTreeMap;
  selectedRepoName: string;
  selectedCommits: Map<string, Commit[]>;
  triggerVizRenderingForSelectedCommits(): void;
  setSelectedCommits(newSelectedCommits: Map<string, Commit[]>): void;
  getCloneOfRepoNameAndBranchNameToColorMap(): Map<string, string>;
  setRepoNameAndBranchNameToColorMap(
    newRepoNameAndBranchNameToColorMap: Map<string, string>
  ): void;
}

const MAX_COMMIT_SELECTION_PER_APP = 2;
const COMMIT_UNSELECTED_SIZE = 8;
const COMMIT_TAGGED_SIZE = 16;
const COMMIT_SELECTED_SIZE = 20;
const HIGHLIGHTED_MARKER_COLOR = 'red';
const BRANCH_LINE_COLOR = 'rgba(70, 130, 180, 1)';
const SKIPPED_COMMIT_LINE_COLOR = 'rgba(70, 130, 180, 0.55)';
const EMPTY_SELECTED_COMMITS: Commit[] = [];
const DEFAULT_METRIC_CHANGE_THRESHOLD = 0;

const X_AXIS_PLACEMENT_OPTIONS: Array<{
  value: CommitXAxisPlacement;
  label: string;
}> = [
  { value: 'equidistant', label: 'Equidistant' },
  { value: 'time', label: 'Time-based' },
];

export default function PlotlyCommitTree({
  repoNameCommitTreeMap,
  selectedRepoName,
  selectedCommits,
  triggerVizRenderingForSelectedCommits,
  setSelectedCommits,
}: PlotlyCommitTreeArgs) {
  const plotlyCommitDivRef = useRef<HTMLDivElement>(null);
  const [selectedBranchName, setSelectedBranchName] = useState('');
  const [selectedMetric, setSelectedMetric] = useState(NONE_METRIC);
  const [metricChangeThresholdInput, setMetricChangeThresholdInput] = useState(
    String(DEFAULT_METRIC_CHANGE_THRESHOLD)
  );
  const [showStatisticsWindow, setShowStatisticsWindow] = useState(false);
  const xAxisPlacement = useCommitTreeStateStore(
    (state) => state._xAxisPlacement
  );
  const setXAxisPlacement = useCommitTreeStateStore(
    (state) => state.setXAxisPlacement
  );

  const commitTree = repoNameCommitTreeMap.get(selectedRepoName);
  const selectedCommitsForRepo =
    selectedCommits.get(selectedRepoName) ?? EMPTY_SELECTED_COMMITS;
  const chartLinkUrl = useMemo(
    () =>
      buildCommitChartLinkUrl(commitTree?.remoteUrl, selectedCommitsForRepo),
    [commitTree?.remoteUrl, selectedCommitsForRepo]
  );
  const chartLinkLabel = getCommitChartLinkLabel(selectedCommitsForRepo.length);
  const chartLinkTooltip = getCommitChartLinkTooltip(
    selectedCommitsForRepo.length
  );
  const selectedBranch = commitTree?.branches.find(
    (branch) => branch.name === selectedBranchName
  );
  const availableMetrics = selectedBranch
    ? getAvailableMetricNames(selectedBranch)
    : [];

  useEffect(() => {
    const branch = getFirstBranchWithCommits(
      repoNameCommitTreeMap.get(selectedRepoName)
    );
    if (branch) {
      setSelectedBranchName(branch.name);
      setSelectedMetric(getDefaultMetricName(branch));
    } else {
      setSelectedBranchName('');
      setSelectedMetric(NONE_METRIC);
    }
  }, [selectedRepoName, repoNameCommitTreeMap]);

  useEffect(() => {
    if (!selectedBranch) {
      return;
    }

    if (
      selectedMetric !== NONE_METRIC &&
      !availableMetrics.includes(selectedMetric)
    ) {
      setSelectedMetric(getDefaultMetricName(selectedBranch));
    }
  }, [selectedBranch, selectedMetric, availableMetrics]);

  const metricChangeThreshold = useMemo(
    () => parseMetricChangeThreshold(metricChangeThresholdInput),
    [metricChangeThresholdInput]
  );
  const isMetricChangeFilterActive =
    selectedMetric !== NONE_METRIC &&
    metricChangeThreshold != null &&
    metricChangeThreshold > 0;

  useEffect(() => {
    if (!selectedRepoName) {
      return;
    }

    const updatedSelectedCommits = removeFilteredCommitsFromSelection(
      selectedCommits,
      selectedRepoName,
      repoNameCommitTreeMap,
      selectedMetric,
      isMetricChangeFilterActive && metricChangeThreshold != null
        ? metricChangeThreshold
        : 0
    );

    if (updatedSelectedCommits === selectedCommits) {
      return;
    }

    setSelectedCommits(updatedSelectedCommits);
    triggerVizRenderingForSelectedCommits();
  }, [
    isMetricChangeFilterActive,
    metricChangeThreshold,
    selectedMetric,
    selectedRepoName,
    repoNameCommitTreeMap,
    selectedCommits,
    setSelectedCommits,
    triggerVizRenderingForSelectedCommits,
  ]);

  useEffect(() => {
    if (!selectedBranch || !plotlyCommitDivRef.current) {
      return;
    }

    renderChart(false);
  }, [
    selectedBranch,
    selectedMetric,
    selectedRepoName,
    repoNameCommitTreeMap,
    xAxisPlacement,
    metricChangeThresholdInput,
  ]);

  useEffect(() => {
    if (!selectedBranch || !plotlyCommitDivRef.current) {
      return;
    }

    renderChart(true);
  }, [selectedCommits]);

  const renderChart = (preserveView: boolean) => {
    if (!selectedBranch || !plotlyCommitDivRef.current) {
      return;
    }

    const chartSeries = buildBranchChartSeries(
      selectedBranch,
      xAxisPlacement,
      selectedMetric,
      isMetricChangeFilterActive
        ? { metricChangeThreshold: metricChangeThreshold! }
        : {}
    );
    const {
      commits: chartCommits,
      xValues,
      yValues,
      originalIndices,
    } = chartSeries;

    const colors = chartCommits.map(() => BRANCH_LINE_COLOR);
    const sizes = chartCommits.map(() => COMMIT_UNSELECTED_SIZE);
    const texts = chartCommits.map(() => '');

    markTaggedCommits(chartCommits, sizes, texts);
    markSelectedCommits(
      selectedCommits.get(selectedRepoName) || [],
      chartCommits,
      colors,
      sizes,
      texts
    );

    const layout = buildLayout(
      selectedMetric,
      yValues,
      xValues,
      xAxisPlacement,
      chartCommits.length
    );
    const plotlyDiv = plotlyCommitDivRef.current as HTMLDivElement & {
      layout?: { xaxis?: { range?: number[] }; yaxis?: { range?: number[] } };
      removeAllListeners?: (event: string) => void;
      on?: (
        event: string,
        handler: (data: Plotly.PlotMouseEvent) => void
      ) => void;
    };

    if (preserveView && plotlyDiv.layout?.xaxis?.range) {
      layout.xaxis.range = [...plotlyDiv.layout.xaxis.range];
    }
    if (preserveView && plotlyDiv.layout?.yaxis?.range) {
      layout.yaxis.range = [...plotlyDiv.layout.yaxis.range];
    }

    Plotly.react(
      plotlyCommitDivRef.current,
      buildPlotlyTraces({
        branchName: selectedBranch.name,
        chartCommits,
        colors,
        sizes,
        texts,
        xValues,
        yValues,
        originalIndices,
        selectedMetric,
        isMetricChangeFilterActive,
        useSegmentedLines:
          isMetricChangeFilterActive ||
          hasSkippedCommitsBetweenVisiblePoints(originalIndices),
      }),
      layout,
      {
        displayModeBar: false,
        doubleClick: false,
        responsive: true,
        scrollZoom: true,
      }
    );

    setupPlotlyListener(selectedBranch.name, chartCommits);
  };

  const refocusChart = () => {
    if (!selectedBranch || !plotlyCommitDivRef.current) {
      return;
    }

    const chartSeries = buildBranchChartSeries(
      selectedBranch,
      xAxisPlacement,
      selectedMetric,
      isMetricChangeFilterActive
        ? { metricChangeThreshold: metricChangeThreshold! }
        : {}
    );
    const layout = buildLayout(
      selectedMetric,
      chartSeries.yValues,
      chartSeries.xValues,
      xAxisPlacement,
      chartSeries.commits.length
    );

    Plotly.relayout(plotlyCommitDivRef.current, {
      'xaxis.range': layout.xaxis.range,
      'yaxis.range': layout.yaxis.range,
    });
  };

  const setupPlotlyListener = (
    branchName: string,
    chartCommits: CommitNode[]
  ) => {
    const plotlyDiv = plotlyCommitDivRef.current as HTMLDivElement & {
      layout?: object;
      removeAllListeners?: (event: string) => void;
      on?: (
        event: string,
        handler: (data: Plotly.PlotMouseEvent) => void
      ) => void;
    };
    const dragLayer = document.getElementsByClassName('nsewdrag')[0] as
      | HTMLElement
      | undefined;

    if (!plotlyDiv?.layout) {
      return;
    }

    plotlyDiv.removeAllListeners?.('plotly_hover');
    plotlyDiv.removeAllListeners?.('plotly_unhover');
    plotlyDiv.removeAllListeners?.('plotly_click');

    plotlyDiv.on?.('plotly_hover', () => {
      if (dragLayer) {
        dragLayer.style.cursor = 'pointer';
      }
    });

    plotlyDiv.on?.('plotly_unhover', () => {
      if (dragLayer) {
        dragLayer.style.cursor = '';
      }
    });

    plotlyDiv.on?.('plotly_click', (data) => {
      const markerPoint = data.points.find((point) => point.curveNumber === 0);
      const pointNumber =
        markerPoint?.pointNumber ?? data.points[0]?.pointNumber;
      if (pointNumber == null) {
        return;
      }

      const commitId =
        chartCommits[pointNumber]?.hash ?? CROSS_COMMIT_IDENTIFIER;
      const selectedCommit: Commit = {
        commitId,
        branchName,
      };

      const newSelectedCommits = toggleCommitInSelection(
        selectedCommits,
        selectedRepoName,
        selectedCommit,
        repoNameCommitTreeMap,
        xAxisPlacement,
        MAX_COMMIT_SELECTION_PER_APP
      );

      setSelectedCommits(newSelectedCommits);
      triggerVizRenderingForSelectedCommits();
    });
  };

  const handleSearchSelectCommit = (commit: Commit) => {
    if (commit.branchName !== selectedBranchName) {
      const branch = commitTree?.branches.find(
        (candidate) => candidate.name === commit.branchName
      );
      setSelectedBranchName(commit.branchName);
      if (branch) {
        setSelectedMetric(getDefaultMetricName(branch));
      }
    }

    const newSelectedCommits = addCommitToSelection(
      selectedCommits,
      selectedRepoName,
      commit,
      repoNameCommitTreeMap,
      xAxisPlacement,
      MAX_COMMIT_SELECTION_PER_APP
    );

    setSelectedCommits(newSelectedCommits);
    triggerVizRenderingForSelectedCommits();
  };

  if (
    !repoNameCommitTreeMap ||
    !selectedRepoName ||
    !commitTree?.branches?.some((branch) => branchHasAnalyzedCommits(branch))
  ) {
    return repoNameCommitTreeMap && repoNameCommitTreeMap.size > 0 ? (
      <div className="commit-tree-no-data-container">
        <div className="commit-tree-no-data-message">
          {selectedRepoName
            ? 'No commit tree data available!'
            : 'No repository selected!'}
        </div>
      </div>
    ) : null;
  }

  return (
    <div className="commit-metrics-chart">
      <div className="commit-metrics-chart-controls">
        <label className="commit-metrics-chart-control">
          <span className="commit-metrics-chart-control-label">Branch</span>
          <select
            value={selectedBranchName}
            onChange={(event) => {
              const branchName = event.target.value;
              const branch = commitTree.branches.find(
                (candidate) => candidate.name === branchName
              );
              setSelectedBranchName(branchName);
              if (branch) {
                setSelectedMetric(getDefaultMetricName(branch));
              }
            }}
            aria-label="Select branch"
            className="commit-metrics-chart-select"
          >
            {commitTree.branches
              .filter((branch) => branchHasAnalyzedCommits(branch))
              .map((branch) => (
                <option key={branch.name} value={branch.name}>
                  {branch.name}
                </option>
              ))}
          </select>
        </label>
        <label className="commit-metrics-chart-control">
          <span className="commit-metrics-chart-control-label">Metric</span>
          <select
            value={selectedMetric}
            onChange={(event) => setSelectedMetric(event.target.value)}
            aria-label="Select metric"
            className="commit-metrics-chart-select"
          >
            <option value={NONE_METRIC}>{NONE_METRIC}</option>
            {availableMetrics.map((metricName) => (
              <option key={metricName} value={metricName}>
                {metricName}
              </option>
            ))}
          </select>
        </label>
        <label className="commit-metrics-chart-control">
          <span className="commit-metrics-chart-control-label">
            Min. change
          </span>
          <input
            type="number"
            min={0}
            step="any"
            value={metricChangeThresholdInput}
            onChange={(event) =>
              setMetricChangeThresholdInput(event.target.value)
            }
            disabled={selectedMetric === NONE_METRIC}
            aria-label="Minimum metric change to show a commit"
            title={
              selectedMetric === NONE_METRIC
                ? 'Select a metric to filter commits by minimum change'
                : 'Show the two commits surrounding each metric change of at least this amount. 0 shows all analyzed commits.'
            }
            className="commit-metrics-chart-threshold-input"
          />
        </label>
        <label className="commit-metrics-chart-control">
          <span className="commit-metrics-chart-control-label">X-axis</span>
          <select
            value={xAxisPlacement}
            onChange={(event) =>
              setXAxisPlacement(event.target.value as CommitXAxisPlacement)
            }
            aria-label="Select x-axis placement"
            className="commit-metrics-chart-select"
          >
            {X_AXIS_PLACEMENT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <Button
          variant="outline-secondary"
          size="sm"
          className="commit-metrics-chart-refocus-button"
          onClick={refocusChart}
          title="Reset pan and zoom to show all commits"
        >
          Re-focus
        </Button>
        <Button
          variant="outline-secondary"
          size="sm"
          className="commit-metrics-chart-refocus-button"
          onClick={() => setShowStatisticsWindow(true)}
          title="Open commit statistics"
        >
          Statistics
        </Button>
        <LinkButton
          url={chartLinkUrl}
          disabled={!chartLinkUrl}
          appearance="outline-button"
          className="commit-metrics-chart-refocus-button"
          label={chartLinkUrl ? chartLinkLabel : 'Open Repository'}
          tooltip={
            chartLinkUrl ? chartLinkTooltip : 'Repository URL unavailable'
          }
        />
        <CommitChartSearch
          commitTree={commitTree}
          onSelectCommit={handleSearchSelectCommit}
        />
      </div>
      <div ref={plotlyCommitDivRef} className="plotlyCommitDiv" />
      {showStatisticsWindow && (
        <CommitStatisticsWindow
          repoNameCommitTreeMap={repoNameCommitTreeMap}
          initialRepoName={selectedRepoName}
          initialBranchName={selectedBranchName}
          onClose={() => setShowStatisticsWindow(false)}
        />
      )}
    </div>
  );
}

function buildPlotlyTraces({
  branchName,
  chartCommits,
  colors,
  sizes,
  texts,
  xValues,
  yValues,
  originalIndices,
  selectedMetric,
  isMetricChangeFilterActive,
  useSegmentedLines,
}: {
  branchName: string;
  chartCommits: CommitNode[];
  colors: string[];
  sizes: number[];
  texts: string[];
  xValues: number[];
  yValues: Array<number | null>;
  originalIndices: number[];
  selectedMetric: string;
  isMetricChangeFilterActive: boolean;
  useSegmentedLines: boolean;
}): Plotly.Data[] {
  const hoverText = buildHoverText(chartCommits, selectedMetric);
  const markerTrace: Plotly.Data = {
    name: branchName,
    marker: { color: colors, size: sizes },
    mode: 'markers+text',
    type: 'scatter',
    hoverinfo: 'text',
    hoverlabel: { align: 'left' },
    text: texts,
    texttemplate: '%{text}',
    cliponaxis: false,
    hovertext: hoverText,
    textposition: 'middle center',
    textfont: {
      color: 'white',
      size: 10,
      family: 'Arial, sans-serif',
    },
    x: xValues,
    y: yValues,
  };

  if (!useSegmentedLines) {
    return [
      {
        ...markerTrace,
        line: { color: BRANCH_LINE_COLOR, width: 2 },
        mode: 'lines+markers+text',
        connectgaps: false,
      },
    ];
  }

  const lineSegments = buildBranchChartLineSegments(
    xValues,
    yValues,
    originalIndices
  );
  const traces: Plotly.Data[] = [markerTrace];

  if (lineSegments.solid.x.length > 0) {
    traces.push({
      type: 'scatter',
      mode: 'lines',
      x: lineSegments.solid.x,
      y: lineSegments.solid.y,
      line: { color: BRANCH_LINE_COLOR, width: 2 },
      hoverinfo: 'skip',
      showlegend: false,
      connectgaps: false,
    });
  }

  if (lineSegments.dashed.x.length > 0) {
    traces.push({
      type: 'scatter',
      mode: 'lines',
      x: lineSegments.dashed.x,
      y: lineSegments.dashed.y,
      line: {
        color: SKIPPED_COMMIT_LINE_COLOR,
        width: 2,
        dash: 'dash',
      },
      hoverinfo: 'skip',
      showlegend: false,
      connectgaps: false,
    });
  }

  return traces;
}

function parseMetricChangeThreshold(input: string): number | null {
  const trimmed = input.trim();
  if (trimmed === '') {
    return null;
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return DEFAULT_METRIC_CHANGE_THRESHOLD;
  }

  return parsed;
}

function markTaggedCommits(
  chartCommits: CommitNode[],
  sizes: number[],
  texts: string[]
) {
  chartCommits.forEach((commit, index) => {
    if (commit.tags?.length) {
      sizes[index] = COMMIT_TAGGED_SIZE;
      texts[index] = 'T';
    }
  });
}

function markSelectedCommits(
  allSelectedCommits: Commit[],
  chartCommits: CommitNode[],
  colors: string[],
  sizes: number[],
  texts: string[]
) {
  allSelectedCommits.forEach((selectedCommit, selectionIndex) => {
    const index = chartCommits.findIndex(
      (commit) => commit.hash === selectedCommit.commitId
    );
    if (index !== -1) {
      colors[index] = HIGHLIGHTED_MARKER_COLOR;
      sizes[index] = COMMIT_SELECTED_SIZE;
      texts[index] = (selectionIndex + 1).toString();
    }
  });
}

function buildHoverText(
  chartCommits: CommitNode[],
  metricName: string
): string[] {
  return chartCommits.map((commit) => {
    const lines = [`Commit ID: ${commit.hash}`];
    const formattedCommitDate = formatCommitDate(commit);
    if (formattedCommitDate) {
      lines.push(`Date: ${formattedCommitDate}`);
    }
    if (metricName !== NONE_METRIC) {
      const metricValue = getMetricValue(commit, metricName);
      lines.push(
        metricValue == null
          ? `${metricName}: pending`
          : `${metricName}: ${metricValue.toLocaleString('en-US')}`
      );
    }
    if (commit.tags?.length) {
      lines.push(`Tags: ${commit.tags.join(', ')}`);
    }
    return lines.join('<br>');
  });
}

function buildLayout(
  metricName: string,
  yValues: Array<number | null>,
  xValues: number[],
  placement: CommitXAxisPlacement,
  commitCount = yValues.length
) {
  const numericValues = yValues.filter(
    (value): value is number => value != null && Number.isFinite(value)
  );
  const minY =
    metricName === NONE_METRIC
      ? -1
      : numericValues.length > 0
        ? Math.min(...numericValues)
        : 0;
  const maxY =
    metricName === NONE_METRIC
      ? 1
      : numericValues.length > 0
        ? Math.max(...numericValues)
        : 1;
  const yPadding = metricName === NONE_METRIC ? 0 : (maxY - minY || 1) * 0.1;

  const xAxis =
    placement === 'time'
      ? buildTimeXAxis(xValues)
      : buildEquidistantXAxis(commitCount);

  return {
    hovermode: 'closest',
    hoverdistance: 3,
    dragmode: 'pan',
    margin: {
      b: placement === 'time' ? 90 : 50,
      l: metricName === NONE_METRIC ? 20 : 60,
      pad: 5,
      t: 10,
      r: 20,
    },
    xaxis: xAxis,
    yaxis: {
      range: [minY - yPadding, maxY + yPadding],
      showgrid: metricName !== NONE_METRIC,
      zeroline: metricName !== NONE_METRIC,
      showline: metricName !== NONE_METRIC,
      showticklabels: metricName !== NONE_METRIC,
      automargin: metricName !== NONE_METRIC,
      tickformat: metricName === NONE_METRIC ? undefined : '.2s',
      tickfont: { color: '#7f7f7f', size: 11 },
      title: {
        font: { color: '#7f7f7f', size: 13 },
        text: metricName === NONE_METRIC ? '' : metricName,
      },
    },
    annotations: [],
  };
}

function buildEquidistantXAxis(commitCount: number) {
  const tickvals = getEquidistantTickValues(commitCount, 6);

  return {
    range: [-0.5, Math.max(commitCount - 0.5, 0.5)],
    showline: true,
    linecolor: '#adb5bd',
    showgrid: false,
    showticklabels: true,
    tickmode: 'array' as const,
    tickvals,
    ticktext: tickvals.map((value) => String(value + 1)),
    tickangle: 0,
    tickfont: { color: '#7f7f7f', size: 11 },
    title: {
      text: 'Commits',
      font: { color: '#7f7f7f', size: 13 },
      standoff: 12,
    },
  };
}

function getEquidistantTickValues(
  commitCount: number,
  maxTicks: number
): number[] {
  if (commitCount <= 0) {
    return [0];
  }

  if (commitCount <= maxTicks) {
    return Array.from({ length: commitCount }, (_, index) => index);
  }

  const step = Math.ceil((commitCount - 1) / (maxTicks - 1));
  const tickvals: number[] = [];

  for (let index = 0; index < commitCount; index += step) {
    tickvals.push(index);
  }

  if (tickvals[tickvals.length - 1] !== commitCount - 1) {
    tickvals.push(commitCount - 1);
  }

  return tickvals;
}

function buildTimeXAxis(xValues: number[]) {
  const numericXValues = xValues.filter((value) => Number.isFinite(value));
  const minX =
    numericXValues.length > 0 ? Math.min(...numericXValues) : Date.now();
  const maxX =
    numericXValues.length > 0 ? Math.max(...numericXValues) : minX + 86_400_000;
  const spanMs = maxX - minX;
  const xPadding = Math.max(spanMs * 0.05, 86_400_000);
  const tickFormat = spanMs > 365 * 86_400_000 ? '%b %Y' : '%b %d, %Y';

  return {
    type: 'date' as const,
    range: [minX - xPadding, maxX + xPadding],
    showline: true,
    linecolor: '#adb5bd',
    showgrid: true,
    gridcolor: '#e9ecef',
    showticklabels: true,
    automargin: true,
    tickangle: 0,
    tickformat: tickFormat,
    tickfont: { color: '#7f7f7f', size: 11 },
    title: {
      text: 'Commit date',
      font: { color: '#7f7f7f', size: 13 },
      standoff: 8,
    },
  };
}
