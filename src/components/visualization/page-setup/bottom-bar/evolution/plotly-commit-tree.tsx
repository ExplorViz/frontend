import { SelectedCommit } from 'explorviz-frontend/src/stores/commit-tree-state';
import {
  getCommitXPosition,
  getFirstBranchWithCommits,
  getMetricValue,
} from 'explorviz-frontend/src/utils/evolution-data-helpers';
import {
  Branch,
  Commit,
  CROSS_COMMIT_IDENTIFIER,
  getAvailableMetricNames,
  getDefaultMetricName,
  NONE_METRIC,
  RepoNameCommitTreeMap,
} from 'explorviz-frontend/src/utils/evolution-schemes/evolution-data';
import Plotly from 'plotly.js-dist';
import { useEffect, useRef, useState } from 'react';
import Button from 'react-bootstrap/Button';

interface PlotlyCommitTreeArgs {
  repoNameCommitTreeMap: RepoNameCommitTreeMap;
  selectedRepoName: string;
  selectedCommits: Map<string, SelectedCommit[]>;
  triggerVizRenderingForSelectedCommits(): void;
  setSelectedCommits(newSelectedCommits: Map<string, SelectedCommit[]>): void;
  getCloneOfRepoNameAndBranchNameToColorMap(): Map<string, string>;
  setRepoNameAndBranchNameToColorMap(
    newRepoNameAndBranchNameToColorMap: Map<string, string>
  ): void;
}

const MAX_COMMIT_SELECTION_PER_APP = 2;
const COMMIT_UNSELECTED_SIZE = 8;
const COMMIT_SELECTED_SIZE = 20;
const HIGHLIGHTED_MARKER_COLOR = 'red';
const BRANCH_LINE_COLOR = 'rgba(70, 130, 180, 1)';

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

  const commitTree = repoNameCommitTreeMap.get(selectedRepoName);
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

  useEffect(() => {
    if (!selectedBranch || !plotlyCommitDivRef.current) {
      return;
    }

    renderChart(false);
  }, [selectedBranch, selectedMetric, selectedRepoName, repoNameCommitTreeMap]);

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

    const xValues = selectedBranch.commits.map((_, index) => index);
    const yValues =
      selectedMetric === NONE_METRIC
        ? selectedBranch.commits.map(() => 0)
        : selectedBranch.commits.map(
            (commit) => getMetricValue(commit, selectedMetric) ?? null
          );

    const colors = selectedBranch.commits.map(() => BRANCH_LINE_COLOR);
    const sizes = selectedBranch.commits.map(() => COMMIT_UNSELECTED_SIZE);
    const texts = selectedBranch.commits.map(() => '');

    markSelectedCommits(
      selectedCommits.get(selectedRepoName) || [],
      selectedBranch,
      colors,
      sizes,
      texts
    );

    const layout = buildLayout(selectedMetric, yValues);
    const plotlyDiv = plotlyCommitDivRef.current as HTMLDivElement & {
      layout?: { xaxis?: { range?: number[] }; yaxis?: { range?: number[] } };
      removeAllListeners?: (event: string) => void;
      on?: (event: string, handler: (data: Plotly.PlotMouseEvent) => void) => void;
    };

    if (preserveView && plotlyDiv.layout?.xaxis?.range) {
      layout.xaxis.range = [...plotlyDiv.layout.xaxis.range];
    }
    if (preserveView && plotlyDiv.layout?.yaxis?.range) {
      layout.yaxis.range = [...plotlyDiv.layout.yaxis.range];
    }

    Plotly.react(
      plotlyCommitDivRef.current,
      [
        {
          name: selectedBranch.name,
          marker: { color: colors, size: sizes },
          line: { color: BRANCH_LINE_COLOR, width: 2 },
          mode: 'lines+markers+text',
          type: 'scatter',
          hoverinfo: 'text',
          hoverlabel: { align: 'left' },
          text: texts,
          texttemplate: '%{text}',
          cliponaxis: false,
          hovertext: buildHoverText(selectedBranch, selectedMetric),
          textposition: 'middle center',
          textfont: {
            color: 'white',
            size: 10,
            family: 'Arial, sans-serif',
          },
          connectgaps: false,
          x: xValues,
          y: yValues,
        },
      ],
      layout,
      {
        displayModeBar: false,
        doubleClick: false,
        responsive: true,
        scrollZoom: true,
      }
    );

    setupPlotlyListener(selectedBranch);
  };

  const refocusChart = () => {
    if (!selectedBranch || !plotlyCommitDivRef.current) {
      return;
    }

    const yValues =
      selectedMetric === NONE_METRIC
        ? selectedBranch.commits.map(() => 0)
        : selectedBranch.commits.map(
            (commit) => getMetricValue(commit, selectedMetric) ?? null
          );
    const layout = buildLayout(selectedMetric, yValues);

    Plotly.relayout(plotlyCommitDivRef.current, {
      'xaxis.range': layout.xaxis.range,
      'yaxis.range': layout.yaxis.range,
    });
  };

  const setupPlotlyListener = (branch: Branch) => {
    const plotlyDiv = plotlyCommitDivRef.current as HTMLDivElement & {
      layout?: object;
      removeAllListeners?: (event: string) => void;
      on?: (event: string, handler: (data: Plotly.PlotMouseEvent) => void) => void;
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
      const pointNumber = data.points[0]?.pointNumber;
      if (pointNumber == null) {
        return;
      }

      const commitId = branch.commits[pointNumber]?.hash ?? CROSS_COMMIT_IDENTIFIER;
      const selectedCommit: Commit = {
        commitId,
        branchName: branch.name,
      };

      const newSelectedCommits = new Map(selectedCommits);
      let selectedCommitsForRepo = [
        ...(newSelectedCommits.get(selectedRepoName) || []),
      ];

      const isAlreadySelected = selectedCommitsForRepo.some(
        (commit) => commit.commitId === selectedCommit.commitId
      );

      if (isAlreadySelected) {
        selectedCommitsForRepo = selectedCommitsForRepo.filter(
          (commit) => commit.commitId !== selectedCommit.commitId
        );
      } else {
        if (selectedCommitsForRepo.length === MAX_COMMIT_SELECTION_PER_APP) {
          selectedCommitsForRepo.shift();
        }
        selectedCommitsForRepo.push(selectedCommit);
      }

      if (selectedCommitsForRepo.length === 2) {
        selectedCommitsForRepo.sort((a, b) => {
          const xA = getCommitXPosition(
            repoNameCommitTreeMap,
            selectedRepoName,
            a.branchName,
            a.commitId
          );
          const xB = getCommitXPosition(
            repoNameCommitTreeMap,
            selectedRepoName,
            b.branchName,
            b.commitId
          );
          return xA - xB;
        });
      }

      if (selectedCommitsForRepo.length === 0) {
        newSelectedCommits.delete(selectedRepoName);
      } else {
        newSelectedCommits.set(selectedRepoName, selectedCommitsForRepo);
      }

      setSelectedCommits(newSelectedCommits);
      triggerVizRenderingForSelectedCommits();
    });
  };

  if (
    !repoNameCommitTreeMap ||
    !selectedRepoName ||
    !commitTree?.branches?.some((branch) => branch.commits.length > 0)
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
              .filter((branch) => branch.commits.length > 0)
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
        <Button
          variant="outline-secondary"
          size="sm"
          className="commit-metrics-chart-refocus-button"
          onClick={refocusChart}
          title="Reset pan and zoom to show all commits"
        >
          Re-focus
        </Button>
      </div>
      <div ref={plotlyCommitDivRef} className="plotlyCommitDiv" />
    </div>
  );
}

function markSelectedCommits(
  allSelectedCommits: Commit[],
  branch: Branch,
  colors: string[],
  sizes: number[],
  texts: string[]
) {
  allSelectedCommits.forEach((selectedCommit, selectionIndex) => {
    const index = branch.commits.findIndex(
      (commit) => commit.hash === selectedCommit.commitId
    );
    if (index !== -1) {
      colors[index] = HIGHLIGHTED_MARKER_COLOR;
      sizes[index] = COMMIT_SELECTED_SIZE;
      texts[index] = (selectionIndex + 1).toString();
    }
  });
}

function buildHoverText(branch: Branch, metricName: string): string[] {
  return branch.commits.map((commit) => {
    const lines = [`Commit ID: ${commit.hash}`];
    if (metricName !== NONE_METRIC) {
      const metricValue = getMetricValue(commit, metricName);
      lines.push(
        metricValue == null
          ? `${metricName}: pending`
          : `${metricName}: ${metricValue.toLocaleString('en-US')}`
      );
    }
    if (!commit.hasAccumulatedMetrics) {
      lines.push('Metrics pending');
    }
    return lines.join('<br>');
  });
}

function buildLayout(metricName: string, yValues: Array<number | null>) {
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

  return {
    hovermode: 'closest',
    hoverdistance: 3,
    dragmode: 'pan',
    margin: {
      b: 40,
      l: metricName === NONE_METRIC ? 20 : 60,
      pad: 5,
      t: 10,
      r: 20,
    },
    xaxis: {
      range: [-0.5, Math.max(yValues.length - 0.5, 0.5)],
      showline: false,
      showgrid: false,
      showticklabels: false,
      title: {
        text: 'Commits',
        font: { color: '#7f7f7f', size: 13 },
      },
    },
    yaxis: {
      range: [minY - yPadding, maxY + yPadding],
      showgrid: metricName !== NONE_METRIC,
      zeroline: metricName !== NONE_METRIC,
      showline: metricName !== NONE_METRIC,
      showticklabels: metricName !== NONE_METRIC,
      title: {
        font: { color: '#7f7f7f', size: 13 },
        text: metricName === NONE_METRIC ? '' : metricName,
      },
    },
    annotations: [],
  };
}
