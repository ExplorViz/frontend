// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useEvolutionAnimationStore } from '../../src/components/visualization/page-setup/bottom-bar/animation/evolution-animation-store';
import { queryCommitChart, queryRuntimeChart } from '../../src/components/chatbot/chart-query';
import {
  assertRequestedByUser,
  getCommitChart,
  getRuntimeChart,
  selectCommits,
  selectTimestamp,
} from '../../src/components/chatbot/chart-selection';
import { useCommitTreeStateStore } from '../../src/stores/commit-tree-state';
import { useEvolutionDataFetchServiceStore } from '../../src/stores/evolution-data-fetch-service';
import { useReloadHandlerStore } from '../../src/stores/reload-handler';
import { useRenderingServiceStore } from '../../src/stores/rendering-service';
import { useEvolutionDataRepositoryStore } from '../../src/stores/repos/evolution-data-repository';
import { useTimestampRepositoryStore } from '../../src/stores/repos/timestamp-repository';
import { useSocialMetricsStore } from '../../src/stores/social-metrics';
import { useTimestampStore } from '../../src/stores/timestamp';
import type { CommitTree } from '../../src/utils/evolution-schemes/evolution-data';
import type { Timestamp } from '../../src/utils/landscape-schemes/timestamp';
import TimelineDataObjectHandler from '../../src/utils/timeline/timeline-data-object-handler';

const hashOf = (digit: string) => digit.repeat(40);
const emptyLandscape = { cities: {}, districts: {}, buildings: {}, functions: {} };

function treeOf(name: string, digits: string): CommitTree {
  return {
    name,
    branches: ['main', 'feature'].map((branch, index) => ({
      name: branch,
      branchPoint: { name: 'NONE', commit: '' },
      commits: [...digits.slice(index * 3, index * 3 + 3)].map((digit) => ({
        hash: hashOf(digit),
        hasAccumulatedMetrics: true,
        metrics: { lineCount: 1 },
      })),
    })),
  };
}

function timestampOf(index: number): Timestamp {
  const from = BigInt(Date.parse('2026-01-01T10:00:00Z') + index * 10_000) * 1_000_000n;
  return { fromUnixNano: from, toUnixNano: from + 10_000_000_000n, traceIds: [], spanCount: 1 };
}

const selectedDigits = (repository = 'shop') =>
  (useCommitTreeStateStore.getState().getSelectedCommits().get(repository) ?? []).map(({ commitId }) => commitId[0]);

const fetchCommits = vi.fn();
const loadTimestamp = vi.fn();
let handler: TimelineDataObjectHandler;

beforeEach(() => {
  fetchCommits.mockResolvedValue(emptyLandscape);
  loadTimestamp.mockResolvedValue([emptyLandscape, [], { metrics: {}, communications: [] }]);
  vi.spyOn(console, 'error').mockImplementation(() => {});

  handler = new TimelineDataObjectHandler();
  handler.updateTimestampsForCommit([timestampOf(0), timestampOf(1)], 'cross-commit');

  useEvolutionAnimationStore.setState({ totalCount: 0 });
  useEvolutionDataFetchServiceStore.setState({ fetchFlatLandscapeForRepositoriesAndCommits: fetchCommits });
  useReloadHandlerStore.setState({ loadLandscapeByTimestamp: loadTimestamp });
  useSocialMetricsStore.setState({ initializeForSelection: vi.fn() });
  useEvolutionDataRepositoryStore.setState({
    _repoNameCommitTreeMap: new Map([
      ['shop', treeOf('shop', 'abcdef')],
      ['blog', treeOf('blog', '123456')],
    ]),
    _repoNameToFlatLandscapeMap: new Map(),
  });
  useTimestampStore.getState().resetState();
  useTimestampRepositoryStore.setState({
    _timelineDataObjectHandler: handler,
    restartTimestampPollingAndVizUpdate: vi.fn(),
  });
  useRenderingServiceStore.setState({
    _timelineDataObjectHandler: handler,
    _analysisMode: 'runtime',
    _visualizationPaused: false,
    _landscapeData: null,
    _userInitiatedStaticDynamicCombination: false,
    currentRuntimeLandscapeData: new Map(),
  });
  useCommitTreeStateStore.setState({
    _selectedCommits: new Map(),
    _currentSelectedRepositoryName: 'shop',
    _repoNameToSelectedBranchNameMap: new Map([
      ['shop', 'main'],
      ['blog', 'main'],
    ]),
  });
});

describe('consent of the user to a selection', () => {
  const ask = (...contents: unknown[]) => contents.map((content) => ({ role: 'user', content }));

  it('accepts a quote of the latest user message regardless of case and punctuation', () => {
    assertRequestedByUser('select “the newest commit”', ask('Please SELECT the\nnewest commit!'));
    assertRequestedByUser('wähle v1.0', ask([{ type: 'text', text: 'Wähle v1.0 aus' }]));
  });

  it('rejects words that the latest user message does not contain', () => {
    const rejects = (quote: string, messages: ReturnType<typeof ask>) =>
      expect(() => assertRequestedByUser(quote, messages)).toThrow('userRequest');

    rejects('select the newest commit', ask('Which commit is the newest?'));
    rejects('select a commit', ask('select a commit', 'thanks'));
    rejects('elect', ask('select a commit'));
    rejects('', ask('select a commit'));
    rejects('...', ask('select a commit'));
    rejects('select a commit', []);
  });

  it('does not take the words of the assistant or of a tool for those of the user', () => {
    const messages = [...ask('hello'), { role: 'assistant', content: 'select a commit' }];
    expect(() => assertRequestedByUser('select a commit', messages)).toThrow('userRequest');
  });
});

it('changes nothing by reading the charts', () => {
  const before = [
    useCommitTreeStateStore.getState(),
    useRenderingServiceStore.getState(),
    useTimestampStore.getState(),
    useEvolutionDataRepositoryStore.getState(),
  ];

  queryCommitChart({}, getCommitChart());
  queryRuntimeChart({}, getRuntimeChart());

  expect([
    useCommitTreeStateStore.getState(),
    useRenderingServiceStore.getState(),
    useTimestampStore.getState(),
    useEvolutionDataRepositoryStore.getState(),
  ]).toEqual(before);
  expect(handler.getAllSelectedTimestampsOfAllCommits()).toEqual([]);
});

describe('selecting commits for the chatbot', () => {
  it('renders two commits in the order of the chart for comparison', async () => {
    await selectCommits(['ccccccc', 'aaaaaaa']);

    expect(selectedDigits()).toEqual(['a', 'c']);
    expect(fetchCommits).toHaveBeenCalledWith({
      repositories: [{ repositoryName: 'shop', commitHashes: [hashOf('a'), hashOf('c')] }],
    });
    expect(useRenderingServiceStore.getState()._analysisMode).toBe('evolution comparison');
  });

  it('replaces the selection of the repository and keeps the one of others', async () => {
    await selectCommits(['aaaaaaa', 'bbbbbbb']);
    await selectCommits(['1111111']);
    await selectCommits(['ccccccc']);

    expect(selectedDigits('shop')).toEqual(['c']);
    expect(selectedDigits('blog')).toEqual(['1']);
  });

  it('shows the repository and branch of the commit in the chart', async () => {
    await selectCommits(['4444444']);

    const state = useCommitTreeStateStore.getState();
    expect(state._currentSelectedRepositoryName).toBe('blog');
    expect(state.getSelectedBranchNameForRepo('blog')).toBe('feature');
  });

  it('clears the selection of one repository or of all', async () => {
    await selectCommits(['aaaaaaa', '1111111']);
    await selectCommits([], 'shop');
    expect([selectedDigits('shop'), selectedDigits('blog')]).toEqual([[], ['1']]);

    await selectCommits([]);
    expect(useCommitTreeStateStore.getState().getSelectedCommits().size).toBe(0);
    expect(useRenderingServiceStore.getState()._analysisMode).toBe('runtime');
  });

  it('changes nothing if one of the commits cannot be selected', async () => {
    await expect(selectCommits(['aaaaaaa', 'fffffff0'])).rejects.toThrow('no commit');
    await expect(selectCommits(['aaaaaaa', 'bbbbbbb', 'ccccccc'])).rejects.toThrow('At most 2');
    useEvolutionAnimationStore.setState({ totalCount: 5 });
    await expect(selectCommits(['aaaaaaa'])).rejects.toThrow('evolution animation');

    expect(selectedDigits()).toEqual([]);
    expect(fetchCommits).not.toHaveBeenCalled();
  });

  it('does not render what is selected already', async () => {
    await selectCommits(['aaaaaaa']);
    expect(await selectCommits(['aaaaaaa'])).toMatchObject({ unchanged: true });
    expect(fetchCommits).toHaveBeenCalledTimes(1);
  });

  it('reports data that could not be loaded', async () => {
    fetchCommits.mockRejectedValue(new Error('offline'));
    await expect(selectCommits(['aaaaaaa'])).rejects.toThrow('could not be loaded');
  });

  it('reports a selection that a filter of the chart drops', async () => {
    fetchCommits.mockImplementationOnce(async () => {
      useCommitTreeStateStore.getState().resetSelectedCommits();
      return emptyLandscape;
    });
    await expect(selectCommits(['aaaaaaa'])).rejects.toThrow('filter');
  });
});

describe('selecting a Timestamp for the chatbot', () => {
  it('renders the Timestamp and no longer follows the newest one', async () => {
    const result = await selectTimestamp('2026-01-01T10:00:03Z');

    expect(result.selectedTimestamps).toEqual({ 'cross-commit': ['2026-01-01T10:00:00.000Z'] });
    expect(loadTimestamp).toHaveBeenCalledWith(timestampOf(0).fromUnixNano, undefined);
    expect(handler.getAllSelectedTimestampsOfAllCommits()).toEqual([timestampOf(0)]);
    expect(useTimestampStore.getState().commitToSelectedTimestamps.get('cross-commit')).toEqual([timestampOf(0)]);
    expect(useRenderingServiceStore.getState()._visualizationPaused).toBe(true);
  });

  it('replaces and clears the selected Timestamp', async () => {
    await selectTimestamp('2026-01-01T10:00:00Z');
    await selectTimestamp('2026-01-01T10:00:10Z');
    expect(handler.getAllSelectedTimestampsOfAllCommits()).toEqual([timestampOf(1)]);

    await selectTimestamp();
    expect(handler.getAllSelectedTimestampsOfAllCommits()).toEqual([]);
  });

  it('changes nothing if there is no such Timestamp', async () => {
    await expect(selectTimestamp('2026-01-02T10:00:00Z')).rejects.toThrow('no Timestamp');
    await expect(selectTimestamp(undefined, 'abc')).rejects.toThrow('no such timeline');

    expect(loadTimestamp).not.toHaveBeenCalled();
    expect(useRenderingServiceStore.getState()._visualizationPaused).toBe(false);
  });

  it('reports data that could not be loaded', async () => {
    loadTimestamp.mockRejectedValue(new Error('offline'));
    await expect(selectTimestamp('2026-01-01T10:00:00Z')).rejects.toThrow('could not be loaded');
  });
});
