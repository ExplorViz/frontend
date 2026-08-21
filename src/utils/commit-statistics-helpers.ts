import {
  commitsHaveAuthorData,
  getCommitAuthorKey,
  getCommitAuthorLabel,
  getCommitDateMs,
} from 'explorviz-frontend/src/utils/evolution-data-helpers';
import {
  Branch,
  CommitNode,
  CommitTree,
} from 'explorviz-frontend/src/utils/evolution-schemes/evolution-data';

export type CommitStatisticsView = 'year' | 'month' | 'weekday' | 'timeOfDay';

export type CommitStatisticsYearGroup = {
  year: string;
  startIndex: number;
  endIndex: number;
};

export type CommitStatisticsAuthorSeries = {
  authorKey: string;
  label: string;
  values: number[];
  color: string;
};

export type CommitStatisticsChartData = {
  labels: string[];
  values: number[];
  xAxisTitle: string;
  yAxisTitle: string;
  hoverLabels?: string[];
  monthLabels?: string[];
  yearGroups?: CommitStatisticsYearGroup[];
  authorSeries?: CommitStatisticsAuthorSeries[];
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

const AUTHOR_BAR_COLORS = [
  'rgba(70, 130, 180, 0.85)',
  'rgba(255, 127, 14, 0.85)',
  'rgba(44, 160, 44, 0.85)',
  'rgba(214, 39, 40, 0.85)',
  'rgba(148, 103, 189, 0.85)',
  'rgba(140, 86, 75, 0.85)',
  'rgba(227, 119, 194, 0.85)',
  'rgba(127, 127, 127, 0.85)',
  'rgba(188, 189, 34, 0.85)',
  'rgba(23, 190, 207, 0.85)',
];

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

type AuthorBucketAccumulator = {
  totals: number[];
  authorCounts: Map<string, { label: string; counts: number[] }>;
};

function createAuthorBucketAccumulator(size: number): AuthorBucketAccumulator {
  return {
    totals: createEmptyCounts(size),
    authorCounts: new Map(),
  };
}

function recordCommitInBucket(
  accumulator: AuthorBucketAccumulator,
  bucketIndex: number,
  commit: CommitNode,
  trackAuthors: boolean
): void {
  accumulator.totals[bucketIndex] += 1;

  if (!trackAuthors) {
    return;
  }

  const authorKey = getCommitAuthorKey(commit);
  const label = getCommitAuthorLabel(commit.author);
  const existingEntry = accumulator.authorCounts.get(authorKey);

  if (existingEntry) {
    existingEntry.counts[bucketIndex] += 1;
    return;
  }

  const counts = createEmptyCounts(accumulator.totals.length);
  counts[bucketIndex] += 1;
  accumulator.authorCounts.set(authorKey, { label, counts });
}

function buildAuthorSeries(
  accumulator: AuthorBucketAccumulator
): CommitStatisticsAuthorSeries[] {
  return [...accumulator.authorCounts.entries()]
    .map(([authorKey, entry]) => ({
      authorKey,
      label: entry.label,
      values: entry.counts,
      total: entry.counts.reduce((sum, count) => sum + count, 0),
    }))
    .sort((left, right) => {
      const totalDiff = right.total - left.total;
      if (totalDiff !== 0) {
        return totalDiff;
      }

      return left.label.localeCompare(right.label);
    })
    .map(({ authorKey, label, values, total: _total }, index) => ({
      authorKey,
      label,
      values,
      color: AUTHOR_BAR_COLORS[index % AUTHOR_BAR_COLORS.length],
    }));
}

function finalizeChartData(
  base: Omit<CommitStatisticsChartData, 'values' | 'authorSeries'>,
  accumulator: AuthorBucketAccumulator,
  includeAuthors: boolean
): CommitStatisticsChartData {
  const chartData: CommitStatisticsChartData = {
    ...base,
    values: accumulator.totals,
  };

  if (includeAuthors && accumulator.authorCounts.size > 0) {
    chartData.authorSeries = buildAuthorSeries(accumulator);
  }

  return chartData;
}

function aggregateByYear(commits: CommitNode[]): CommitStatisticsChartData {
  const counts = new Map<number, number>();
  const includeAuthors = commitsHaveAuthorData(commits);

  for (const commit of commits) {
    const commitDateMs = getCommitDateMs(commit);
    if (commitDateMs == null) {
      continue;
    }

    const year = new Date(commitDateMs).getFullYear();
    counts.set(year, (counts.get(year) ?? 0) + 1);
  }

  const years = [...counts.keys()].sort((left, right) => left - right);
  const accumulator = createAuthorBucketAccumulator(years.length);
  const yearToIndex = new Map(years.map((year, index) => [year, index]));

  for (const commit of commits) {
    const commitDateMs = getCommitDateMs(commit);
    if (commitDateMs == null) {
      continue;
    }

    const bucketIndex = yearToIndex.get(new Date(commitDateMs).getFullYear());
    if (bucketIndex == null) {
      continue;
    }

    recordCommitInBucket(accumulator, bucketIndex, commit, includeAuthors);
  }

  return finalizeChartData(
    {
      labels: years.map(String),
      xAxisTitle: 'Year',
      yAxisTitle: 'Commits',
    },
    accumulator,
    includeAuthors
  );
}

function buildYearGroups(years: string[]): CommitStatisticsYearGroup[] {
  const groups: CommitStatisticsYearGroup[] = [];
  let groupStartIndex = 0;

  for (let index = 1; index <= years.length; index += 1) {
    if (index === years.length || years[index] !== years[index - 1]) {
      groups.push({
        year: years[index - 1],
        startIndex: groupStartIndex,
        endIndex: index - 1,
      });
      groupStartIndex = index;
    }
  }

  return groups;
}

function formatYearMonthKey(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

function enumerateYearMonths(startKey: string, endKey: string): string[] {
  const [startYear, startMonth] = startKey.split('-').map(Number);
  const [endYear, endMonth] = endKey.split('-').map(Number);

  const yearMonths: string[] = [];
  let year = startYear;
  let month = startMonth - 1;

  while (year < endYear || (year === endYear && month < endMonth)) {
    yearMonths.push(formatYearMonthKey(year, month));

    month++;
    if (month > 11) {
      month = 0;
      year++;
    }
  }

  return yearMonths;
}

function aggregateByMonth(commits: CommitNode[]): CommitStatisticsChartData {
  const counts = new Map<string, number>();
  const includeAuthors = commitsHaveAuthorData(commits);

  for (const commit of commits) {
    const commitDateMs = getCommitDateMs(commit);
    if (commitDateMs == null) {
      continue;
    }

    const date = new Date(commitDateMs);
    const key = formatYearMonthKey(date.getFullYear(), date.getMonth());
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const committedYearMonths = [...counts.keys()].sort();
  if (committedYearMonths.length === 0) {
    return {
      labels: [],
      values: [],
      xAxisTitle: '',
      yAxisTitle: 'Commits',
    };
  }

  const yearMonths = enumerateYearMonths(
    committedYearMonths[0],
    committedYearMonths[committedYearMonths.length - 1]
  );

  const years: string[] = [];
  const monthLabels: string[] = [];
  const hoverLabels: string[] = [];

  for (const yearMonth of yearMonths) {
    const [year, month] = yearMonth.split('-');
    years.push(year);
    const monthLabel = MONTH_LABELS[Number(month) - 1];
    monthLabels.push(monthLabel);
    hoverLabels.push(`${monthLabel} ${year}`);
  }

  const accumulator = createAuthorBucketAccumulator(yearMonths.length);
  const yearMonthToIndex = new Map(
    yearMonths.map((yearMonth, index) => [yearMonth, index])
  );

  for (const commit of commits) {
    const commitDateMs = getCommitDateMs(commit);
    if (commitDateMs == null) {
      continue;
    }

    const date = new Date(commitDateMs);
    const key = formatYearMonthKey(date.getFullYear(), date.getMonth());
    const bucketIndex = yearMonthToIndex.get(key);
    if (bucketIndex == null) {
      continue;
    }

    recordCommitInBucket(accumulator, bucketIndex, commit, includeAuthors);
  }

  return finalizeChartData(
    {
      labels: yearMonths,
      monthLabels,
      yearGroups: buildYearGroups(years),
      hoverLabels,
      xAxisTitle: '',
      yAxisTitle: 'Commits',
    },
    accumulator,
    includeAuthors
  );
}

function aggregateByWeekday(commits: CommitNode[]): CommitStatisticsChartData {
  const includeAuthors = commitsHaveAuthorData(commits);
  const accumulator = createAuthorBucketAccumulator(WEEKDAY_LABELS.length);

  for (const commit of commits) {
    const commitDateMs = getCommitDateMs(commit);
    if (commitDateMs == null) {
      continue;
    }

    const weekdayIndex = (new Date(commitDateMs).getDay() + 6) % 7;
    recordCommitInBucket(accumulator, weekdayIndex, commit, includeAuthors);
  }

  return finalizeChartData(
    {
      labels: WEEKDAY_LABELS,
      xAxisTitle: 'Weekday',
      yAxisTitle: 'Commits',
    },
    accumulator,
    includeAuthors
  );
}

function aggregateByTimeOfDay(
  commits: CommitNode[]
): CommitStatisticsChartData {
  const includeAuthors = commitsHaveAuthorData(commits);
  const accumulator = createAuthorBucketAccumulator(24);

  for (const commit of commits) {
    const commitDateMs = getCommitDateMs(commit);
    if (commitDateMs == null) {
      continue;
    }

    recordCommitInBucket(
      accumulator,
      new Date(commitDateMs).getHours(),
      commit,
      includeAuthors
    );
  }

  return finalizeChartData(
    {
      labels: accumulator.totals.map(
        (_, hour) => `${String(hour).padStart(2, '0')}:00`
      ),
      xAxisTitle: 'Time of day',
      yAxisTitle: 'Commits',
    },
    accumulator,
    includeAuthors
  );
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

export function filterCommitStatisticsByAuthors(
  chartData: CommitStatisticsChartData,
  selectedAuthorKeys: Set<string>
): CommitStatisticsChartData {
  if (!chartData.authorSeries?.length) {
    return chartData;
  }

  const filteredSeries = chartData.authorSeries.filter((series) =>
    selectedAuthorKeys.has(series.authorKey)
  );
  const values = chartData.labels.map((_, index) =>
    filteredSeries.reduce((sum, series) => sum + series.values[index], 0)
  );

  return {
    ...chartData,
    values,
    authorSeries: filteredSeries,
  };
}

export { commitsHaveAuthorData };
