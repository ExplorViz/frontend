import { useCommitTreeStateStore } from 'explorviz-frontend/src/stores/commit-tree-state';
import { useEvolutionDataRepositoryStore } from 'explorviz-frontend/src/stores/repos/evolution-data-repository';
import {
  CommitSampling,
  CommitTreeFilters,
  hasActiveCommitTreeFilters,
  NONE_METRIC,
} from 'explorviz-frontend/src/utils/evolution-schemes/evolution-data';
import { useEffect, useState } from 'react';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';

const DAY = 24 * 60 * 60 * 1000;
const DEFAULT_METRIC_CHANGE_THRESHOLD = 0;

const SAMPLING_OPTIONS: Array<{ value: CommitSampling; label: string }> = [
  { value: 'none', label: 'None' },
  { value: 'daily', label: 'Daily' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

const toISO = (epochMs: number) => new Date(epochMs).toISOString().slice(0, 10);
const fromISO = (str: string) => Date.parse(str);
const fromISOEnd = (str: string) => Date.parse(str) + DAY - 1;

function parseMetricChangeThreshold(input: string): number {
  const trimmed = input.trim();
  if (trimmed === '') {
    return DEFAULT_METRIC_CHANGE_THRESHOLD;
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return DEFAULT_METRIC_CHANGE_THRESHOLD;
  }

  return parsed;
}

interface CommitChartFiltersProps {
  expanded: boolean;
  selectedMetric: string;
  appliedMetricChangeThreshold: number;
  onFiltersApplied: (metricChangeThreshold: number) => void;
}

export default function CommitChartFilters({
  expanded,
  selectedMetric,
  appliedMetricChangeThreshold,
  onFiltersApplied,
}: CommitChartFiltersProps) {
  const appliedFilters = useCommitTreeStateStore(
    (state) => state._commitTreeFilters
  );
  const setCommitTreeFilters = useCommitTreeStateStore(
    (state) => state.setCommitTreeFilters
  );
  const fetchAndStoreRepositoryCommitTrees = useEvolutionDataRepositoryStore(
    (state) => state.fetchAndStoreRepositoryCommitTrees
  );

  const [draftFrom, setDraftFrom] = useState('');
  const [draftTo, setDraftTo] = useState('');
  const [draftSampling, setDraftSampling] = useState<CommitSampling>('none');
  const [draftFirstParentOnly, setDraftFirstParentOnly] = useState(true);
  const [draftMetricChangeThresholdInput, setDraftMetricChangeThresholdInput] =
    useState(String(DEFAULT_METRIC_CHANGE_THRESHOLD));
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    setDraftFrom(
      appliedFilters.fromTimestamp != null
        ? toISO(appliedFilters.fromTimestamp)
        : ''
    );
    setDraftTo(
      appliedFilters.toTimestamp != null
        ? toISO(appliedFilters.toTimestamp)
        : ''
    );
    setDraftSampling(appliedFilters.sampling);
    setDraftFirstParentOnly(appliedFilters.firstParentOnly);
    setDraftMetricChangeThresholdInput(String(appliedMetricChangeThreshold));
  }, [appliedFilters, appliedMetricChangeThreshold]);

  const draftMetricChangeThreshold = parseMetricChangeThreshold(
    draftMetricChangeThresholdInput
  );

  const hasDraftChanges =
    (draftFrom ? fromISO(draftFrom) : undefined) !==
      appliedFilters.fromTimestamp ||
    (draftTo ? fromISOEnd(draftTo) : undefined) !==
      appliedFilters.toTimestamp ||
    draftSampling !== appliedFilters.sampling ||
    draftFirstParentOnly !== appliedFilters.firstParentOnly ||
    draftMetricChangeThreshold !== appliedMetricChangeThreshold;

  const buildFiltersFromDraft = (): CommitTreeFilters => ({
    sampling: draftSampling,
    firstParentOnly: draftFirstParentOnly,
    ...(draftFrom ? { fromTimestamp: fromISO(draftFrom) } : {}),
    ...(draftTo ? { toTimestamp: fromISOEnd(draftTo) } : {}),
    ...(appliedFilters.authorKeys !== undefined
      ? { authorKeys: appliedFilters.authorKeys }
      : {}),
  });

  const applyFilters = async (
    filters: CommitTreeFilters,
    metricChangeThreshold: number
  ) => {
    setIsApplying(true);
    try {
      setCommitTreeFilters(filters);
      const success = await fetchAndStoreRepositoryCommitTrees();
      if (success) {
        onFiltersApplied(metricChangeThreshold);
      }
    } finally {
      setIsApplying(false);
    }
  };

  const handleApply = async () => {
    await applyFilters(buildFiltersFromDraft(), draftMetricChangeThreshold);
  };

  const handleReset = async () => {
    setDraftFrom('');
    setDraftTo('');
    setDraftSampling('none');
    setDraftFirstParentOnly(true);
    setDraftMetricChangeThresholdInput(String(DEFAULT_METRIC_CHANGE_THRESHOLD));
    await applyFilters(
      {
        sampling: 'none',
        firstParentOnly: true,
        ...(appliedFilters.authorKeys !== undefined
          ? { authorKeys: appliedFilters.authorKeys }
          : {}),
      },
      DEFAULT_METRIC_CHANGE_THRESHOLD
    );
  };

  const hasActiveFilters = hasActiveCommitTreeFilters(
    appliedFilters,
    appliedMetricChangeThreshold
  );

  if (!expanded) {
    return null;
  }

  return (
    <div className="commit-metrics-chart-filter-panel">
      <div
        id="commit-chart-filter-row"
        className="commit-metrics-chart-filter-row"
      >
        <label className="commit-metrics-chart-control">
          <span className="commit-metrics-chart-control-label">From</span>
          <Form.Control
            type="date"
            size="sm"
            className="commit-metrics-chart-date-input"
            value={draftFrom}
            onChange={(event) => setDraftFrom(event.target.value)}
            aria-label="Filter commits from date"
          />
        </label>
        <label className="commit-metrics-chart-control">
          <span className="commit-metrics-chart-control-label">To</span>
          <Form.Control
            type="date"
            size="sm"
            className="commit-metrics-chart-date-input"
            value={draftTo}
            onChange={(event) => setDraftTo(event.target.value)}
            aria-label="Filter commits to date"
          />
        </label>
        <label className="commit-metrics-chart-control">
          <span className="commit-metrics-chart-control-label">Sampling</span>
          <select
            value={draftSampling}
            onChange={(event) =>
              setDraftSampling(event.target.value as CommitSampling)
            }
            aria-label="Commit sampling interval"
            className="commit-metrics-chart-select commit-metrics-chart-sampling-select"
          >
            {SAMPLING_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
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
            value={draftMetricChangeThresholdInput}
            onChange={(event) =>
              setDraftMetricChangeThresholdInput(event.target.value)
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
        <Form.Check
          type="checkbox"
          id="commit-chart-first-parent-only"
          className="commit-metrics-chart-control commit-metrics-chart-checkbox"
          label="First Parent Only"
          checked={draftFirstParentOnly}
          onChange={(event) => setDraftFirstParentOnly(event.target.checked)}
          title="Show only commits reachable via first-parent links, as with git log --first-parent"
        />
        <Button
          variant={hasDraftChanges ? 'primary' : 'outline-secondary'}
          size="sm"
          className="commit-metrics-chart-refocus-button"
          onClick={() => void handleApply()}
          disabled={isApplying || !hasDraftChanges}
          title="Apply filter changes to the commit chart"
        >
          Apply filters
        </Button>
        {hasActiveFilters && (
          <Button
            variant="outline-secondary"
            size="sm"
            className="commit-metrics-chart-refocus-button"
            onClick={() => void handleReset()}
            disabled={isApplying}
            title="Clear filters and reload all commits"
          >
            Reset
          </Button>
        )}
      </div>
    </div>
  );
}
