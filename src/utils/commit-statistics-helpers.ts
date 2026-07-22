import { getCommitDateMs } from 'explorviz-frontend/src/utils/evolution-data-helpers';
import {
  Branch,
  CommitNode,
  CommitTree,
} from 'explorviz-frontend/src/utils/evolution-schemes/evolution-data';

export type CommitStatisticsView = 'year' | 'month' | 'weekday' | 'timeOfDay';

export type CommitStatisticsChartData = {
  labels: string[];
  values: number[];
  xAxisTitle: string;
  yAxisTitle: string;
};

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const COMMIT_STATISTICS_VIEW_OPTIONS: Array<{
  value: CommitStatisticsView;
  label: string;
}> = [
  { value: 'timeOfDay', label: 'Commits per Time of Day' },
  { value: 'weekday', label: 'Commits per Weekday' },
  { value: 'month', label: 'Commits per Month' },
  { value: 'year', label: 'Commits per Year' },
];

export function getBranchCommits(
  commitTree: CommitTree | undefined,
  branchName: string
): CommitNode[] {
  if (!commitTree) {
    return [];
  }

  const branch = commitTree.branches.find(
    (candidate) => candidate.name === branchName
  );
  return branch?.commits ?? [];
}

export function getBranchesWithDatedCommits(
  branch: Branch | undefined
): boolean {
  return (
    branch?.commits.some((commit) => getCommitDateMs(commit) != null) ?? false
  );
}

function parseDateInputBoundary(
  value: string | undefined,
  endOfDay: boolean
): number | null {
  if (!value?.trim()) {
    return null;
  }

  const parts = value.split('-').map(Number);
  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) {
    return null;
  }

  const [year, month, day] = parts;
  return endOfDay
    ? new Date(year, month - 1, day, 23, 59, 59, 999).getTime()
    : new Date(year, month - 1, day, 0, 0, 0, 0).getTime();
}

export function filterCommitsByDateRange(
  commits: CommitNode[],
  dateFrom?: string,
  dateTo?: string
): CommitNode[] {
  const fromMs = parseDateInputBoundary(dateFrom, false);
  const toMs = parseDateInputBoundary(dateTo, true);

  return commits.filter((commit) => {
    const commitDateMs = getCommitDateMs(commit);
    if (commitDateMs == null) {
      return false;
    }

    if (fromMs != null && commitDateMs < fromMs) {
      return false;
    }

    if (toMs != null && commitDateMs > toMs) {
      return false;
    }

    return true;
  });
}

function createEmptyCounts(size: number): number[] {
  return Array.from({ length: size }, () => 0);
}

function aggregateByYear(commits: CommitNode[]): CommitStatisticsChartData {
  const counts = new Map<number, number>();

  for (const commit of commits) {
    const commitDateMs = getCommitDateMs(commit);
    if (commitDateMs == null) {
      continue;
    }

    const year = new Date(commitDateMs).getFullYear();
    counts.set(year, (counts.get(year) ?? 0) + 1);
  }

  const years = [...counts.keys()].sort((left, right) => left - right);

  return {
    labels: years.map(String),
    values: years.map((year) => counts.get(year) ?? 0),
    xAxisTitle: 'Year',
    yAxisTitle: 'Commits',
  };
}

function aggregateByMonth(commits: CommitNode[]): CommitStatisticsChartData {
  const counts = createEmptyCounts(MONTH_LABELS.length);

  for (const commit of commits) {
    const commitDateMs = getCommitDateMs(commit);
    if (commitDateMs == null) {
      continue;
    }

    counts[new Date(commitDateMs).getMonth()] += 1;
  }

  return {
    labels: MONTH_LABELS,
    values: counts,
    xAxisTitle: 'Month',
    yAxisTitle: 'Commits',
  };
}

function aggregateByWeekday(commits: CommitNode[]): CommitStatisticsChartData {
  const counts = createEmptyCounts(WEEKDAY_LABELS.length);

  for (const commit of commits) {
    const commitDateMs = getCommitDateMs(commit);
    if (commitDateMs == null) {
      continue;
    }

    const weekdayIndex = (new Date(commitDateMs).getDay() + 6) % 7;
    counts[weekdayIndex] += 1;
  }

  return {
    labels: WEEKDAY_LABELS,
    values: counts,
    xAxisTitle: 'Weekday',
    yAxisTitle: 'Commits',
  };
}

function aggregateByTimeOfDay(
  commits: CommitNode[]
): CommitStatisticsChartData {
  const counts = createEmptyCounts(24);

  for (const commit of commits) {
    const commitDateMs = getCommitDateMs(commit);
    if (commitDateMs == null) {
      continue;
    }

    counts[new Date(commitDateMs).getHours()] += 1;
  }

  return {
    labels: counts.map((_, hour) => `${String(hour).padStart(2, '0')}:00`),
    values: counts,
    xAxisTitle: 'Time of day',
    yAxisTitle: 'Commits',
  };
}

export function aggregateCommitStatistics(
  commits: CommitNode[],
  view: CommitStatisticsView
): CommitStatisticsChartData {
  switch (view) {
    case 'year':
      return aggregateByYear(commits);
    case 'month':
      return aggregateByMonth(commits);
    case 'weekday':
      return aggregateByWeekday(commits);
    case 'timeOfDay':
      return aggregateByTimeOfDay(commits);
  }
}
