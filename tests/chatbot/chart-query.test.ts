import { describe, expect, it } from 'vitest';
import {
  parseTime,
  queryCommitChart,
  queryRuntimeChart,
  resolveCommit,
  resolveTimestamp,
  type CommitChart,
  type RuntimeChart,
} from '../../src/components/chatbot/chart-query';
import type { CommitNode } from '../../src/utils/evolution-schemes/evolution-data';
import type { Timestamp } from '../../src/utils/landscape-schemes/timestamp';

const hashOf = (digit: string) => digit.repeat(40);

function commitOf(digit: string, day: number, lineCount: number, rest: Partial<CommitNode> = {}): CommitNode {
  return {
    hash: hashOf(digit),
    commitDate: `2026-01-${String(day).padStart(2, '0')}T12:00:00Z`,
    metrics: { lineCount },
    hasAccumulatedMetrics: true,
    author: { contributorId: Number(day), gitUsername: `dev${day}@example.com`, email: `dev${day}@example.com` },
    ...rest,
  };
}

function chartOf(overrides: Partial<CommitChart> = {}): CommitChart {
  const main = {
    name: 'main',
    branchPoint: { name: 'NONE', commit: '' },
    commits: [
      commitOf('a', 1, 100),
      commitOf('b', 2, 500, { tags: ['v1.0'], author: { githubLogin: 'alice', email: 'alice@example.com' } }),
      { hash: hashOf('9'), hasAccumulatedMetrics: false },
      commitOf('c', 4, 200),
    ],
  };
  const feature = {
    name: 'feature',
    branchPoint: { name: 'main', commit: hashOf('b') },
    commits: [commitOf('b', 2, 500), commitOf('d', 3, 510)],
  };
  return {
    commitTrees: new Map([['shop', { name: 'shop', branches: [feature, main] }]]),
    selectedCommits: new Map([['shop', [{ commitId: hashOf('c'), branchName: 'main' }]]]),
    shownRepository: 'shop',
    shownBranches: new Map([['shop', 'main']]),
    filters: { sampling: 'none', firstParentOnly: false },
    ...overrides,
  };
}

type Listed = { hash: string; branch?: string; change?: number; selected?: boolean; author?: string }[];
const commitsOf = (result: object) => (result as { commits: Listed }).commits;
const digitsOf = (result: object) => commitsOf(result).map(({ hash }) => hash[0]);

describe('reading the commit chart for the chatbot', () => {
  it('lists analyzed commits newest first, each once, and marks the selected one', () => {
    const result = queryCommitChart({}, chartOf());

    expect(digitsOf(result)).toEqual(['c', 'd', 'b', 'a']);
    expect(commitsOf(result)[2].branch).toBe('main');
    expect(commitsOf(result).map(({ selected }) => selected)).toEqual([true, undefined, undefined, undefined]);
  });

  it('summarizes repositories and branches', () => {
    const { repositories } = queryCommitChart({ detailLevel: 'summary' }, chartOf()) as {
      repositories: { name: string; branches: object[] }[];
    };

    expect(repositories[0].branches[0]).toEqual({
      name: 'main',
      shown: true,
      analyzedCommits: 3,
      firstCommitDate: '2026-01-01T12:00:00Z',
      lastCommitDate: '2026-01-04T12:00:00Z',
      metrics: ['lineCount'],
    });
  });

  it('finds commits by tag, hash, and date', () => {
    expect(digitsOf(queryCommitChart({ search: 'V1' }, chartOf()))).toEqual(['b']);
    expect(commitsOf(queryCommitChart({ hashes: ['aaaa'] }, chartOf()))[0].hash).toBe(hashOf('a'));
    expect(digitsOf(queryCommitChart({ from: '2026-01-02', to: '2026-01-04' }, chartOf()))).toEqual(['d', 'b']);
  });

  it('sorts by metric and by metric change', () => {
    expect(digitsOf(queryCommitChart({ branch: 'main', sortByMetric: 'lineCount' }, chartOf()))).toEqual([
      'b',
      'c',
      'a',
    ]);

    const byChange = queryCommitChart({ branch: 'main', sortByMetricChange: 'lineCount' }, chartOf());
    expect(commitsOf(byChange).map(({ change }) => change)).toEqual([400, -300, undefined]);
  });

  it('counts what the limit cuts off', () => {
    expect(queryCommitChart({ maxCommits: 1 }, chartOf())).toMatchObject({ omitted: 3 });
  });

  it('names what is known if something is unknown', () => {
    expect(() => queryCommitChart({ repository: 'x' }, chartOf())).toThrow('Known: shop');
    expect(() => queryCommitChart({ branch: 'x' }, chartOf())).toThrow('Known: feature, main');
  });

  it('ignores metrics that do not exist and says which ones do', () => {
    const result = queryCommitChart({ metrics: ['commitCount', 'lineCount'], sortByMetricChange: 'x' }, chartOf());

    expect(result).toMatchObject({
      unknownMetrics: { ignored: ['commitCount', 'x'], available: ['lineCount'] },
      commits: [{ metrics: { lineCount: 200 } }, {}, {}, {}],
    });
  });

  it('returns all metrics and their differences for two commits', () => {
    expect(queryCommitChart({ hashes: ['aaaaaaa', 'ccccccc'] }, chartOf())).toMatchObject({
      commits: [{ metrics: { lineCount: 200 } }, { metrics: { lineCount: 100 } }],
      difference: { from: 'a'.repeat(10), to: 'c'.repeat(10), metrics: { lineCount: 100 } },
    });
  });

  it('leaves authors out unless asked for, and never returns email addresses', () => {
    expect(JSON.stringify(queryCommitChart({}, chartOf()))).not.toContain('author');

    const result = queryCommitChart({ includeAuthors: true }, chartOf());
    expect(commitsOf(result).map(({ author }) => author)).toEqual(['#4', '#3', 'alice', '#1']);
    expect(JSON.stringify(result)).not.toContain('@');
    expect(commitsOf(queryCommitChart({ author: 'example.com' }, chartOf()))).toEqual([]);
  });

  it('respects the author filter of the chart without revealing whom it shows', () => {
    const chart = chartOf({
      filters: { sampling: 'none', firstParentOnly: false, authorKeys: ['name:alice'] },
    });
    const result = queryCommitChart({ branch: 'main' }, chart);

    expect(digitsOf(result)).toEqual(['b']);
    expect(result).toMatchObject({ activeChartFilters: { onlySomeAuthors: true } });
    expect(() => resolveCommit('aaaaaaa', chart)).toThrow('author filter');
  });

  it('resolves shortened hashes to the branch that is shown', () => {
    expect(resolveCommit('bbbbbbb', chartOf())).toEqual({
      repository: 'shop',
      commit: { commitId: hashOf('b'), branchName: 'main' },
    });
    expect(() => resolveCommit('b', chartOf())).toThrow('too short');
    expect(() => resolveCommit('eeeeeee', chartOf())).toThrow('no commit');
    expect(() => resolveCommit('9999999', chartOf())).toThrow('no commit');
  });

  it('requires the repository for a hash that is in several', () => {
    const { commitTrees } = chartOf();
    const chart = chartOf({ commitTrees: new Map([...commitTrees, ['fork', commitTrees.get('shop')!]]) });

    expect(() => resolveCommit('aaaaaaa', chart)).toThrow('ambiguous');
    expect(resolveCommit('aaaaaaa', chart, 'fork').repository).toBe('fork');
  });
});

const START = '2026-01-01T10:00:00.000Z';

function timestampOf(index: number, spanCount: number): Timestamp {
  const from = BigInt(Date.parse(START) + index * 10_000) * 1_000_000n;
  return { fromUnixNano: from, toUnixNano: from + 10_000_000_000n, traceIds: ['t'], spanCount };
}

function runtimeChartOf(commitIds = ['cross-commit']): RuntimeChart {
  const timestamps = [timestampOf(0, 5), timestampOf(1, 50), timestampOf(3, 20)];
  return {
    timelines: new Map(
      commitIds.map((id) => [
        id,
        {
          timestamps,
          selectedTimestamps: [timestamps[1]],
          highlightedMarkerColor: 'blue',
          applicationNameAndBranchNameToColorMap: new Map(),
        },
      ])
    ),
    bucketSizeMs: 10_000,
    updatesPaused: false,
  };
}

const timesOf = (result: object) =>
  (result as { timestamps: { time: string }[] }).timestamps.map(({ time }) => time.slice(17, 19));

describe('reading the runtime chart for the chatbot', () => {
  it('summarizes the timelines', () => {
    expect(queryRuntimeChart({ detailLevel: 'summary' }, runtimeChartOf())).toEqual({
      bucketSizeMs: 10_000,
      showsNewestTimestampAutomatically: true,
      timelines: [
        {
          commit: 'cross-commit',
          timestampCount: 3,
          spanCount: 75,
          first: START,
          last: '2026-01-01T10:00:30.000Z',
          selected: ['2026-01-01T10:00:10.000Z'],
        },
      ],
    });
  });

  it('lists Timestamps newest first or by number of spans', () => {
    expect(timesOf(queryRuntimeChart({}, runtimeChartOf()))).toEqual(['30', '10', '00']);
    expect(timesOf(queryRuntimeChart({ sortBySpanCount: true }, runtimeChartOf()))).toEqual(['10', '30', '00']);
  });

  it('filters by time and number of spans and still totals what the limit cuts off', () => {
    expect(timesOf(queryRuntimeChart({ from: '2026-01-01 10:00:10', minSpanCount: 30 }, runtimeChartOf()))).toEqual([
      '10',
    ]);
    expect(queryRuntimeChart({ maxTimestamps: 1 }, runtimeChartOf())).toMatchObject({
      omitted: 2,
      matchingSpanCount: 75,
    });
  });

  it('resolves a time to its Timestamp or the one whose Time Window contains it', () => {
    const at = (time: string) => resolveTimestamp(time, runtimeChartOf()).timestamp.spanCount;

    expect(at('2026-01-01T10:00:10Z')).toBe(50);
    expect(at('2026-01-01T10:00:19')).toBe(50);
    expect(at('2026-01-01T11:00:19+01:00')).toBe(50);
    expect(() => at('2026-01-01T10:00:25Z')).toThrow('no Timestamp');
  });

  it('requires the commit if there are several timelines', () => {
    const chart = runtimeChartOf([hashOf('a'), hashOf('b')]);

    expect(() => resolveTimestamp(START, chart)).toThrow('several timelines');
    expect(resolveTimestamp(START, chart, 'bbbbbbb').commitId).toBe(hashOf('b'));
  });

  it('can be serialized as JSON', () => {
    expect(() => JSON.stringify(queryRuntimeChart({}, runtimeChartOf()))).not.toThrow();
  });
});

it('rejects times that are none', () => {
  expect(() => parseTime('yesterday')).toThrow('ISO 8601');
});
