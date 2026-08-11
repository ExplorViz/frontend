import { DownloadIcon, XIcon } from '@primer/octicons-react';
import {
  aggregateCommitStatistics,
  COMMIT_STATISTICS_VIEW_OPTIONS,
  CommitStatisticsView,
  filterCommitsByDateRange,
  getBranchCommits,
  getBranchesWithDatedCommits,
} from 'explorviz-frontend/src/utils/commit-statistics-helpers';
import { RepoNameCommitTreeMap } from 'explorviz-frontend/src/utils/evolution-schemes/evolution-data';
import Plotly from 'plotly.js-dist';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Button from 'react-bootstrap/Button';
import { createPortal } from 'react-dom';

const BAR_COLOR = 'rgba(70, 130, 180, 0.85)';
const DEFAULT_WINDOW_POSITION = { left: 120, top: 80 };

function sanitizeFilenamePart(value: string): string {
  return (
    value.replace(/[^a-z0-9-_]+/gi, '-').replace(/^-+|-+$/g, '') || 'unknown'
  );
}

function buildCommitStatisticsImageFilename(
  repoName: string,
  branchName: string,
  statisticsView: CommitStatisticsView
): string {
  const viewLabel =
    COMMIT_STATISTICS_VIEW_OPTIONS.find(
      (option) => option.value === statisticsView
    )?.label ?? statisticsView;

  return [
    'commit-statistics',
    sanitizeFilenamePart(repoName),
    sanitizeFilenamePart(branchName),
    sanitizeFilenamePart(viewLabel),
  ].join('-');
}

type CommitStatisticsWindowProps = {
  repoNameCommitTreeMap: RepoNameCommitTreeMap;
  initialRepoName: string;
  initialBranchName: string;
  onClose: () => void;
};

export default function CommitStatisticsWindow({
  repoNameCommitTreeMap,
  initialRepoName,
  initialBranchName,
  onClose,
}: CommitStatisticsWindowProps) {
  const windowRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const lastPointerPosition = useRef({ x: 0, y: 0 });

  const repositoryNames = useMemo(
    () =>
      [...repoNameCommitTreeMap.keys()].sort((left, right) =>
        left.localeCompare(right)
      ),
    [repoNameCommitTreeMap]
  );

  const [selectedRepoName, setSelectedRepoName] = useState(
    repositoryNames.includes(initialRepoName)
      ? initialRepoName
      : (repositoryNames[0] ?? '')
  );
  const [selectedBranchName, setSelectedBranchName] =
    useState(initialBranchName);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statisticsView, setStatisticsView] =
    useState<CommitStatisticsView>('timeOfDay');
  const [isDownloadingImage, setIsDownloadingImage] = useState(false);

  const commitTree = repoNameCommitTreeMap.get(selectedRepoName);
  const branchOptions = useMemo(
    () =>
      commitTree?.branches.filter((branch) =>
        getBranchesWithDatedCommits(branch)
      ) ?? [],
    [commitTree]
  );

  useEffect(() => {
    if (branchOptions.length === 0) {
      setSelectedBranchName('');
      return;
    }

    if (!branchOptions.some((branch) => branch.name === selectedBranchName)) {
      setSelectedBranchName(branchOptions[0].name);
    }
  }, [branchOptions, selectedBranchName]);

  const filteredCommits = useMemo(() => {
    const branchCommits = getBranchCommits(commitTree, selectedBranchName);
    return filterCommitsByDateRange(branchCommits, dateFrom, dateTo);
  }, [commitTree, selectedBranchName, dateFrom, dateTo]);

  const chartData = useMemo(
    () => aggregateCommitStatistics(filteredCommits, statisticsView),
    [filteredCommits, statisticsView]
  );

  useLayoutEffect(() => {
    const windowElement = windowRef.current;
    if (!windowElement) {
      return;
    }

    windowElement.style.left = `${DEFAULT_WINDOW_POSITION.left}px`;
    windowElement.style.top = `${DEFAULT_WINDOW_POSITION.top}px`;
  }, []);

  useEffect(() => {
    const chartElement = chartRef.current;
    if (!chartElement) {
      return;
    }

    const trace: Plotly.Data = {
      type: 'bar',
      x: chartData.labels,
      y: chartData.values,
      marker: { color: BAR_COLOR },
      hovertemplate: '%{x}<br>%{y} commits<extra></extra>',
    };

    const layout: Partial<Plotly.Layout> = {
      hovermode: 'closest',
      dragmode: false,
      margin: { b: 60, l: 50, pad: 5, t: 20, r: 20 },
      xaxis: {
        type: 'category',
        categoryorder: 'array',
        categoryarray: chartData.labels,
        title: {
          text: chartData.xAxisTitle,
          font: { color: '#7f7f7f', size: 13 },
        },
        tickfont: { color: '#7f7f7f', size: 11 },
        automargin: true,
      },
      yaxis: {
        title: {
          text: chartData.yAxisTitle,
          font: { color: '#7f7f7f', size: 13 },
        },
        tickfont: { color: '#7f7f7f', size: 11 },
        rangemode: 'tozero',
      },
    };

    const config: Partial<Plotly.Config> = {
      displayModeBar: false,
      responsive: true,
    };

    Plotly.react(chartElement, [trace], layout, config);
  }, [chartData]);

  useEffect(() => {
    const chartElement = chartRef.current;
    return () => {
      if (chartElement) {
        Plotly.purge(chartElement);
      }
    };
  }, []);

  const dragMove = (event: PointerEvent) => {
    event.preventDefault();
    const windowElement = windowRef.current;
    if (!windowElement) {
      return;
    }

    const diffX = lastPointerPosition.current.x - event.clientX;
    const diffY = lastPointerPosition.current.y - event.clientY;
    lastPointerPosition.current = { x: event.clientX, y: event.clientY };

    const nextLeft = Math.max(
      0,
      Math.min(
        windowElement.offsetLeft - diffX,
        window.innerWidth - windowElement.offsetWidth
      )
    );
    const nextTop = Math.max(
      0,
      Math.min(
        windowElement.offsetTop - diffY,
        window.innerHeight - windowElement.offsetHeight
      )
    );

    windowElement.style.left = `${nextLeft}px`;
    windowElement.style.top = `${nextTop}px`;
  };

  const dragEnd = () => {
    document.onpointerup = null;
    document.onpointermove = null;
  };

  const dragStart = (event: React.PointerEvent) => {
    if ((event.target as HTMLElement).closest('button, select, input')) {
      return;
    }

    lastPointerPosition.current = { x: event.clientX, y: event.clientY };
    document.onpointerup = dragEnd;
    document.onpointermove = dragMove;
  };

  const downloadChartImage = async () => {
    const chartElement = chartRef.current;
    if (!chartElement || filteredCommits.length === 0 || isDownloadingImage) {
      return;
    }

    setIsDownloadingImage(true);

    try {
      await Plotly.downloadImage(chartElement, {
        format: 'png',
        filename: buildCommitStatisticsImageFilename(
          selectedRepoName,
          selectedBranchName,
          statisticsView
        ),
        width: Math.max(chartElement.offsetWidth, 800),
        height: Math.max(chartElement.offsetHeight, 320),
      });
    } catch (error) {
      console.error('Failed to download commit statistics chart:', error);
    } finally {
      setIsDownloadingImage(false);
    }
  };

  return createPortal(
    <div
      ref={windowRef}
      className="commit-statistics-window"
      onPointerDown={dragStart}
      role="dialog"
      aria-labelledby="commit-statistics-window-title"
      aria-modal="false"
    >
      <div className="commit-statistics-window-header">
        <h2
          id="commit-statistics-window-title"
          className="commit-statistics-window-title"
        >
          Commit Statistics
        </h2>
        <Button
          type="button"
          variant="outline-secondary"
          size="sm"
          className="commit-statistics-window-close"
          onClick={onClose}
          title="Close statistics window"
          aria-label="Close statistics window"
        >
          <XIcon className="align-middle" />
        </Button>
      </div>

      <div className="commit-statistics-window-controls">
        <label className="commit-statistics-window-control">
          <span className="commit-statistics-window-control-label">
            Repository
          </span>
          <select
            value={selectedRepoName}
            onChange={(event) => setSelectedRepoName(event.target.value)}
            aria-label="Select repository"
            className="commit-statistics-window-control-input"
          >
            {repositoryNames.map((repoName) => (
              <option key={repoName} value={repoName}>
                {repoName}
              </option>
            ))}
          </select>
        </label>

        <label className="commit-statistics-window-control">
          <span className="commit-statistics-window-control-label">Branch</span>
          <select
            value={selectedBranchName}
            onChange={(event) => setSelectedBranchName(event.target.value)}
            aria-label="Select branch"
            className="commit-statistics-window-control-input"
            disabled={branchOptions.length === 0}
          >
            {branchOptions.map((branch) => (
              <option key={branch.name} value={branch.name}>
                {branch.name}
              </option>
            ))}
          </select>
        </label>

        <label className="commit-statistics-window-control">
          <span className="commit-statistics-window-control-label">From</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
            aria-label="Filter commits from date"
            className="commit-statistics-window-control-input"
          />
        </label>

        <label className="commit-statistics-window-control">
          <span className="commit-statistics-window-control-label">To</span>
          <input
            type="date"
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
            aria-label="Filter commits to date"
            className="commit-statistics-window-control-input"
          />
        </label>

        <label className="commit-statistics-window-control commit-statistics-window-control--full">
          <span className="commit-statistics-window-control-label">Chart</span>
          <select
            value={statisticsView}
            onChange={(event) =>
              setStatisticsView(event.target.value as CommitStatisticsView)
            }
            aria-label="Select statistics chart"
            className="commit-statistics-window-control-input"
          >
            {COMMIT_STATISTICS_VIEW_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="commit-statistics-window-summary">
        <span>
          {filteredCommits.length === 0
            ? 'No commits with dates match the current filters.'
            : `${filteredCommits.length.toLocaleString('en-US')} commits in selection`}
        </span>
        <Button
          type="button"
          variant="outline-secondary"
          size="sm"
          className="commit-statistics-window-download"
          onClick={() => void downloadChartImage()}
          disabled={filteredCommits.length === 0 || isDownloadingImage}
          title="Download chart as PNG image"
        >
          <DownloadIcon className="align-middle me-1" size={14} />
          Download
        </Button>
      </div>

      <div ref={chartRef} className="commit-statistics-window-chart" />
    </div>,
    document.body
  );
}
