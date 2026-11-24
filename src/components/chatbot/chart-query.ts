import {
  branchHasAnalyzedCommits,
  commitHasAnalyzedMetrics,
  getCommitDateMs,
  getMetricValue,
  isCommitVisibleWithAuthorFilter,
} from 'explorviz-frontend/src/utils/evolution-data-helpers';
import {
  Branch,
  Commit,
  CommitAuthor,
  CommitNode,
  CommitTree,
  CommitTreeFilters,
  getAvailableMetricNames,
  hasActiveAuthorFilter,
  RepoNameCommitTreeMap,
} from 'explorviz-frontend/src/utils/evolution-schemes/evolution-data';
import { Timestamp } from 'explorviz-frontend/src/utils/landscape-schemes/timestamp';
import type { TimelineDataObject } from 'explorviz-frontend/src/utils/timeline/timeline-data-object-handler';

/*
 * Everything in this file only reads: answering a question about a chart must
 * never change what is selected. Selecting is done in chart-selection.ts.
 */

export const DEFAULT_MAX_COMMITS = 30;
export const DEFAULT_MAX_TIMESTAMPS = 50;

/** Long enough to be unique in practice; a full hash costs four times the tokens. */
const SHORT_HASH_LENGTH = 10;
const MIN_HASH_PREFIX_LENGTH = 4;

type Entry = Record<string, unknown>;

/** Drops absent values so they cost no tokens. */
function compact(entry: Entry): Entry {
  return Object.fromEntries(Object.entries(entry).filter(([, value]) => value !== undefined && value !== null));
}

function toLimit(limit: number | undefined, fallback: number) {
  return typeof limit === 'number' && limit >= 0 ? Math.floor(limit) : fallback;
}

/** Both charts are addressed in UTC: a time without an offset does not depend on the browser's time zone. */
export function parseTime(time: string): number {
  const isoTime = time.trim().replace(' ', 'T');
  const hasOffset = !isoTime.includes('T') || /(Z|[+-]\d{2}:?\d{2})$/i.test(isoTime);
  const ms = Date.parse(hasOffset ? isoTime : `${isoTime}Z`);
  if (Number.isNaN(ms)) {
    throw new Error(`"${time}" is not an ISO 8601 time such as 2026-01-31T14:05:20Z.`);
  }
  return ms;
}

function isWithin(ms: number, from: number | undefined, to: number | undefined) {
  return (from === undefined || ms >= from) && (to === undefined || ms < to);
}

// #region Commit chart

export interface CommitChart {
  commitTrees: RepoNameCommitTreeMap;
  selectedCommits: Map<string, Commit[]>;
  shownRepository: string;
  shownBranches: Map<string, string>;
  filters: CommitTreeFilters;
}

export interface CommitChartQuery {
  detailLevel?: 'summary' | 'commits';
  repository?: string;
  branch?: string;
  search?: string;
  hashes?: string[];
  author?: string;
  includeAuthors?: boolean;
  from?: string;
  to?: string;
  metrics?: string[];
  sortByMetric?: string;
  sortByMetricChange?: string;
  maxCommits?: number;
}

interface ChartCommit {
  repository: string;
  branch: Branch;
  node: CommitNode;
  /** The commit before it on the same branch that has metrics, if any. */
  previous?: CommitNode;
}

function findByName<T>(items: T[], nameOf: (item: T) => string, name: string, kind: string): T {
  const match =
    items.find((item) => nameOf(item) === name.trim()) ??
    items.find((item) => nameOf(item).toLowerCase() === name.trim().toLowerCase());
  if (!match) {
    throw new Error(`Unknown ${kind} "${name}". Known: ${items.map(nameOf).join(', ') || 'none'}.`);
  }
  return match;
}

function findCommitTrees(chart: CommitChart, repository?: string): [string, CommitTree][] {
  const entries = [...chart.commitTrees.entries()];
  return repository ? [findByName(entries, ([name]) => name, repository, 'repository')] : entries;
}

/**
 * The author as shown in the chart, but never as an email address: what is
 * returned here leaves the browser for the provider of the language model.
 */
export function getAuthorWithoutEmail(author: CommitAuthor | undefined): string {
  const name = [author?.githubLogin, author?.gitUsername].find((candidate) => candidate && !candidate.includes('@'));
  return name ?? (author?.contributorId != null ? `#${author.contributorId}` : 'Unknown author');
}

/** The branch the chart shows comes first, so it is the one a commit on several branches is attributed to. */
function getBranchesInOrder(chart: CommitChart, repository: string, commitTree: CommitTree) {
  const shownBranch = chart.shownBranches.get(repository);
  return [...commitTree.branches]
    .filter(branchHasAnalyzedCommits)
    .sort((a, b) => Number(b.name === shownBranch) - Number(a.name === shownBranch));
}

/** The commits that the chart can show with its current filters. */
function listChartCommits(chart: CommitChart, repository?: string, branchName?: string): ChartCommit[] {
  const result: ChartCommit[] = [];
  let branchFound = false;

  for (const [repoName, commitTree] of findCommitTrees(chart, repository)) {
    const seenHashes = new Set<string>();
    for (const branch of getBranchesInOrder(chart, repoName, commitTree)) {
      if (branchName && branch.name.toLowerCase() !== branchName.trim().toLowerCase()) {
        continue;
      }
      branchFound = true;

      let previous: CommitNode | undefined;
      const commitsOfBranch: ChartCommit[] = [];
      for (const node of branch.commits.filter(commitHasAnalyzedMetrics)) {
        if (!seenHashes.has(node.hash) && isCommitVisibleWithAuthorFilter(node, chart.filters.authorKeys)) {
          seenHashes.add(node.hash);
          commitsOfBranch.push({ repository: repoName, branch, node, previous });
        }
        previous = node;
      }
      result.push(...commitsOfBranch.reverse());
    }
  }

  if (branchName && !branchFound) {
    const known = findCommitTrees(chart, repository).flatMap(([, { branches }]) =>
      branches.filter(branchHasAnalyzedCommits).map(({ name }) => name)
    );
    throw new Error(`Unknown branch "${branchName}". Known: ${[...new Set(known)].join(', ') || 'none'}.`);
  }
  return result;
}

function describeFilters(filters: CommitTreeFilters) {
  const toIso = (ms?: number) => (ms === undefined ? undefined : new Date(ms).toISOString());
  const result = compact({
    from: toIso(filters.fromTimestamp),
    to: toIso(filters.toTimestamp),
    sampling: filters.sampling === 'none' ? undefined : filters.sampling,
    firstParentOnly: filters.firstParentOnly || undefined,
    onlySomeAuthors: hasActiveAuthorFilter(filters) || undefined,
  });
  return Object.keys(result).length > 0 ? result : undefined;
}

function summarizeCommitChart(query: CommitChartQuery, chart: CommitChart) {
  return findCommitTrees(chart, query.repository).map(([name, commitTree]) => ({
    name,
    ...(name === chart.shownRepository && { shown: true }),
    branches: getBranchesInOrder(chart, name, commitTree).map((branch) => {
      const commits = branch.commits.filter(
        (commit) =>
          commitHasAnalyzedMetrics(commit) && isCommitVisibleWithAuthorFilter(commit, chart.filters.authorKeys)
      );
      return compact({
        name: branch.name,
        shown: name === chart.shownRepository && branch.name === chart.shownBranches.get(name) ? true : undefined,
        // Not "commitCount", which is the name of a metric of buildings.
        analyzedCommits: commits.length,
        firstCommitDate: commits[0]?.commitDate,
        lastCommitDate: commits.at(-1)?.commitDate,
        metrics: getAvailableMetricNames(branch),
      });
    }),
  }));
}

function getMetricChange({ node, previous }: ChartCommit, metric: string): number | undefined {
  const current = getMetricValue(node, metric);
  const before = previous ? getMetricValue(previous, metric) : null;
  return current === null || before === null ? undefined : current - before;
}

function listMetricNames(commits: ChartCommit[]) {
  return [...new Set(commits.flatMap(({ node }) => Object.keys(node.metrics ?? {})))].sort();
}

function getMetrics(node: CommitNode, metrics: string[]) {
  const values = metrics.map((metric) => [metric, getMetricValue(node, metric)] as const);
  return Object.fromEntries(values.filter(([, value]) => value !== null));
}

/** How the metrics changed from the older to the newer commit; only metrics that differ. */
function getDifference(newer: ChartCommit, older: ChartCommit, metrics: string[]) {
  const differences = metrics.map((metric) => {
    const [after, before] = [getMetricValue(newer.node, metric), getMetricValue(older.node, metric)];
    return [metric, after === null || before === null ? 0 : after - before] as const;
  });
  return {
    from: older.node.hash.slice(0, SHORT_HASH_LENGTH),
    to: newer.node.hash.slice(0, SHORT_HASH_LENGTH),
    metrics: Object.fromEntries(differences.filter(([, difference]) => difference !== 0)),
  };
}

/** Answers a chatbot query against the data of the commit chart. */
export function queryCommitChart(query: CommitChartQuery, chart: CommitChart) {
  const filters = describeFilters(chart.filters);

  if (query.detailLevel === 'summary') {
    return compact({ activeChartFilters: filters, repositories: summarizeCommitChart(query, chart) });
  }

  const from = query.from ? parseTime(query.from) : undefined;
  const to = query.to ? parseTime(query.to) : undefined;
  const search = query.search?.trim().toLowerCase();
  const hashes = query.hashes?.map((hash) => hash.trim().toLowerCase()).filter(Boolean);
  const author = query.author?.trim().toLowerCase();

  const candidates = listChartCommits(chart, query.repository, query.branch);

  // A metric that does not exist must not keep the chatbot from getting the others.
  const knownMetrics = listMetricNames(candidates);
  const isKnown = (metric: string) => knownMetrics.includes(metric);
  const { sortByMetric, sortByMetricChange } = query;
  const requestedMetrics = [
    ...(query.metrics ?? (hashes?.length ? knownMetrics : [])),
    ...(sortByMetric ? [sortByMetric] : []),
  ];
  const metrics = [...new Set(requestedMetrics.filter(isKnown))];
  const unknownMetrics = [
    ...new Set([...requestedMetrics, ...(sortByMetricChange ? [sortByMetricChange] : [])]),
  ].filter((metric) => !isKnown(metric));

  const commits = candidates.filter(({ node }) => {
    const dateMs = getCommitDateMs(node);
    return (
      (!hashes?.length || hashes.some((hash) => node.hash.toLowerCase().startsWith(hash))) &&
      (!search ||
        node.hash.toLowerCase().startsWith(search) ||
        node.tags?.some((tag) => tag.toLowerCase().includes(search))) &&
      (!author || getAuthorWithoutEmail(node.author).toLowerCase().includes(author)) &&
      ((from === undefined && to === undefined) || (dateMs !== null && isWithin(dateMs, from, to)))
    );
  });

  if (sortByMetricChange) {
    const sizeOf = (commit: ChartCommit) => Math.abs(getMetricChange(commit, sortByMetricChange) ?? -1);
    const hasChange = (commit: ChartCommit) => getMetricChange(commit, sortByMetricChange) !== undefined;
    commits.sort((a, b) => Number(hasChange(b)) - Number(hasChange(a)) || sizeOf(b) - sizeOf(a));
  } else if (sortByMetric) {
    const valueOf = ({ node }: ChartCommit) => getMetricValue(node, sortByMetric) ?? Number.NEGATIVE_INFINITY;
    commits.sort((a, b) => valueOf(b) - valueOf(a));
  } else if (new Set(commits.map(({ repository, branch }) => `${repository}\0${branch.name}`)).size > 1) {
    // Commits of one branch already are in their order, which need not be the one of their dates.
    const dateOf = ({ node }: ChartCommit) => getCommitDateMs(node) ?? Number.NEGATIVE_INFINITY;
    commits.sort((a, b) => dateOf(b) - dateOf(a));
  }

  const withRepository = chart.commitTrees.size > 1 && !query.repository;
  const listed = commits.slice(0, toLimit(query.maxCommits, DEFAULT_MAX_COMMITS));
  // Sorted otherwise, the first commit need not be the newer one.
  const isComparison =
    hashes?.length === 2 &&
    listed.length === 2 &&
    listed[0].repository === listed[1].repository &&
    !sortByMetric &&
    !sortByMetricChange;

  return compact({
    activeChartFilters: filters,
    unknownMetrics: unknownMetrics.length > 0 ? { ignored: unknownMetrics, available: knownMetrics } : undefined,
    commits: listed.map((commit) => {
      const { node, branch, repository } = commit;
      const isSelected = chart.selectedCommits.get(repository)?.some(({ commitId }) => commitId === node.hash);
      return compact({
        hash: hashes?.length ? node.hash : node.hash.slice(0, SHORT_HASH_LENGTH),
        repository: withRepository ? repository : undefined,
        branch: query.branch ? undefined : branch.name,
        date: node.commitDate,
        tags: node.tags,
        author: query.includeAuthors || author ? getAuthorWithoutEmail(node.author) : undefined,
        metrics: metrics.length > 0 ? getMetrics(node, metrics) : undefined,
        change: sortByMetricChange ? getMetricChange(commit, sortByMetricChange) : undefined,
        selected: isSelected || undefined,
      });
    }),
    difference: isComparison ? getDifference(listed[0], listed[1], metrics) : undefined,
    omitted: commits.length > listed.length ? commits.length - listed.length : undefined,
  });
}

/** Finds the one commit of the chart that a (possibly shortened) hash stands for. */
export function resolveCommit(
  hash: string,
  chart: CommitChart,
  repository?: string
): { repository: string; commit: Commit } {
  const prefix = hash.trim().toLowerCase();
  if (prefix.length < MIN_HASH_PREFIX_LENGTH) {
    throw new Error(`"${hash}" is too short for a commit hash. Look up the hash with query-commit-chart.`);
  }

  const matches = listChartCommits(chart, repository).filter(({ node }) => node.hash.toLowerCase().startsWith(prefix));
  if (matches.length === 0) {
    throw new Error(
      `The commit chart has no commit "${hash}"${hasActiveAuthorFilter(chart.filters) ? ' that its author filter shows' : ''}. Look up the hash with query-commit-chart.`
    );
  }
  if (matches.length > 1) {
    const found = matches.map((match) => `${match.node.hash} (${match.repository})`).join(', ');
    throw new Error(`The commit hash "${hash}" is ambiguous: ${found}. Pass the full hash and the repository.`);
  }
  const [{ node, branch, repository: repoName }] = matches;
  return { repository: repoName, commit: { commitId: node.hash, branchName: branch.name } };
}

// #endregion

// #region Runtime chart

export interface RuntimeChart {
  timelines: TimelineDataObject;
  bucketSizeMs: number;
  updatesPaused: boolean;
}

export interface RuntimeChartQuery {
  detailLevel?: 'summary' | 'timestamps';
  commit?: string;
  from?: string;
  to?: string;
  minSpanCount?: number;
  sortBySpanCount?: boolean;
  maxTimestamps?: number;
}

function toMs(nanos: bigint) {
  return Number(nanos / 1_000_000n);
}

export function toIsoTime(nanos: bigint): string {
  return new Date(toMs(nanos)).toISOString();
}

function findTimelines(chart: RuntimeChart, commit?: string) {
  const timelines = [...chart.timelines.entries()].filter(([, { timestamps }]) => timestamps.length > 0);
  if (!commit) {
    return timelines;
  }
  const prefix = commit.trim().toLowerCase();
  const matches = timelines.filter(([commitId]) => commitId.toLowerCase().startsWith(prefix));
  if (matches.length !== 1) {
    const known = timelines.map(([commitId]) => commitId).join(', ') || 'none';
    throw new Error(`The runtime chart has no single timeline for commit "${commit}". Timelines: ${known}.`);
  }
  return matches;
}

function inOrder(timestamps: Timestamp[]) {
  return [...timestamps].sort((a, b) => Number(a.fromUnixNano - b.fromUnixNano));
}

/** Answers a chatbot query against the data of the runtime chart. */
export function queryRuntimeChart(query: RuntimeChartQuery, chart: RuntimeChart) {
  const timelines = findTimelines(chart, query.commit);
  const from = query.from ? parseTime(query.from) : undefined;
  const to = query.to ? parseTime(query.to) : undefined;

  const matches = timelines.flatMap(([commitId, { timestamps, selectedTimestamps }]) => {
    const selected = new Set(selectedTimestamps.map(({ fromUnixNano }) => fromUnixNano));
    return timestamps
      .filter(
        (timestamp) =>
          isWithin(toMs(timestamp.fromUnixNano), from, to) && timestamp.spanCount >= (query.minSpanCount ?? 0)
      )
      .map((timestamp) => ({ commitId, timestamp, isSelected: selected.has(timestamp.fromUnixNano) }));
  });
  matches.sort(
    (a, b) =>
      (query.sortBySpanCount ? b.timestamp.spanCount - a.timestamp.spanCount : 0) ||
      Number(b.timestamp.fromUnixNano - a.timestamp.fromUnixNano)
  );

  const overview = {
    bucketSizeMs: chart.bucketSizeMs,
    showsNewestTimestampAutomatically: !chart.updatesPaused,
    timelines: timelines.map(([commitId, { timestamps, selectedTimestamps }]) => {
      const ordered = inOrder(timestamps);
      return {
        commit: commitId,
        timestampCount: ordered.length,
        spanCount: ordered.reduce((sum, { spanCount }) => sum + spanCount, 0),
        first: toIsoTime(ordered[0].fromUnixNano),
        last: toIsoTime(ordered[ordered.length - 1].fromUnixNano),
        selected: selectedTimestamps.map(({ fromUnixNano }) => toIsoTime(fromUnixNano)),
      };
    }),
  };
  if (query.detailLevel === 'summary') {
    return overview;
  }

  const listed = matches.slice(0, toLimit(query.maxTimestamps, DEFAULT_MAX_TIMESTAMPS));
  return compact({
    ...overview,
    matchingTimestampCount: matches.length,
    matchingSpanCount: matches.reduce((sum, { timestamp }) => sum + timestamp.spanCount, 0),
    timestamps: listed.map(({ commitId, timestamp, isSelected }) =>
      compact({
        time: toIsoTime(timestamp.fromUnixNano),
        commit: timelines.length > 1 ? commitId : undefined,
        spanCount: timestamp.spanCount,
        traceCount: timestamp.traceIds.length,
        selected: isSelected || undefined,
      })
    ),
    omitted: matches.length > listed.length ? matches.length - listed.length : undefined,
  });
}

/** Finds the Timestamp at the given time, or the one whose Time Window contains it. */
export function resolveTimestamp(
  time: string,
  chart: RuntimeChart,
  commit?: string
): { commitId: string; timestamp: Timestamp } {
  const ms = parseTime(time);
  const timelines = findTimelines(chart, commit);
  if (timelines.length === 0) {
    throw new Error('The runtime chart has no Timestamps.');
  }
  if (timelines.length > 1) {
    const known = timelines.map(([commitId]) => commitId).join(', ');
    throw new Error(`The runtime chart has several timelines. Pass the commit of one of them: ${known}.`);
  }

  const [[commitId, { timestamps }]] = timelines;
  const timestamp =
    timestamps.find(({ fromUnixNano }) => toMs(fromUnixNano) === ms) ??
    timestamps.find(({ fromUnixNano, toUnixNano }) => isWithin(ms, toMs(fromUnixNano), toMs(toUnixNano)));
  if (!timestamp) {
    const [first, ...others] = inOrder(timestamps);
    const last = others.at(-1) ?? first;
    throw new Error(
      `The runtime chart has no Timestamp at "${time}". It ranges from ${toIsoTime(first.fromUnixNano)} to ${toIsoTime(last.fromUnixNano)}, possibly with gaps. Look up the time with query-runtime-chart.`
    );
  }
  return { commitId, timestamp };
}

// #endregion
