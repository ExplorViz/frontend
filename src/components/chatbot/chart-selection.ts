import { useEvolutionAnimationStore } from 'explorviz-frontend/src/components/visualization/page-setup/bottom-bar/animation/evolution-animation-store';
import { useCommitTreeStateStore } from 'explorviz-frontend/src/stores/commit-tree-state';
import { useRenderingServiceStore } from 'explorviz-frontend/src/stores/rendering-service';
import { useEvolutionDataRepositoryStore } from 'explorviz-frontend/src/stores/repos/evolution-data-repository';
import { useTimestampStore } from 'explorviz-frontend/src/stores/timestamp';
import { useTimestampPollingStore } from 'explorviz-frontend/src/stores/timestamp-polling';
import { addCommitToSelection } from 'explorviz-frontend/src/utils/evolution-data-helpers';
import { Commit } from 'explorviz-frontend/src/utils/evolution-schemes/evolution-data';
import { Timestamp } from 'explorviz-frontend/src/utils/landscape-schemes/timestamp';
import { CommitChart, resolveCommit, resolveTimestamp, RuntimeChart, toIsoTime } from './chart-query';
import type { ConversationMessage } from './landscape-query';

/** Same as by clicking in the commit chart: two commits of a repository are compared. */
const MAX_SELECTED_COMMITS_PER_REPOSITORY = 2;

export function getCommitChart(): CommitChart {
  const state = useCommitTreeStateStore.getState();
  return {
    commitTrees: useEvolutionDataRepositoryStore.getState()._repoNameCommitTreeMap,
    selectedCommits: state.getSelectedCommits(),
    shownRepository: state._currentSelectedRepositoryName,
    shownBranches: state.getRepoNameToSelectedBranchNameMap(),
    filters: state.getCommitTreeFilters(),
  };
}

export function getRuntimeChart(): RuntimeChart {
  const { _timelineDataObjectHandler, _visualizationPaused } = useRenderingServiceStore.getState();
  return {
    timelines: _timelineDataObjectHandler?.timelineDataObject ?? new Map(),
    bucketSizeMs: useTimestampPollingStore.getState().bucketSize,
    updatesPaused: _visualizationPaused,
  };
}

/** Whether the landscape shows how it changed from one selected commit to the other. */
export function isComparingCommits() {
  return [...useCommitTreeStateStore.getState().getSelectedCommits().values()].some(
    (commits) => commits.length === MAX_SELECTED_COMMITS_PER_REPOSITORY
  );
}

// #region Consent

function getText(content: unknown): string {
  if (typeof content === 'string') {
    return content;
  }
  // Messages with attachments consist of several parts.
  return Array.isArray(content) ? content.map((part) => (part?.type === 'text' ? part.text : '')).join(' ') : '';
}

/** Words only, so that different quotation marks, punctuation, or line breaks do not matter. */
function toWords(text: string) {
  return text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/**
 * A selection replaces what the user is looking at, so the chatbot has to quote
 * the words of the latest user message that ask for it. A model that selects
 * something on its own initiative has nothing to quote and is turned down here,
 * rather than only being told not to by the tool description.
 */
export function assertRequestedByUser(quote: string, messages: readonly ConversationMessage[]) {
  const latestUserMessage = messages.findLast(({ role }) => role === 'user');
  const quotedWords = toWords(quote);
  const isQuoted = ` ${toWords(getText(latestUserMessage?.content))} `.includes(` ${quotedWords} `);
  if (!quotedWords || !isQuoted) {
    throw new Error(
      'userRequest must quote, word for word, the part of the latest user message that asks for this selection. If the user did not ask for it, do not select anything.'
    );
  }
}

// #endregion

function assertNoEvolutionAnimation() {
  if (useEvolutionAnimationStore.getState().totalCount > 0) {
    throw new Error('The user has to leave the evolution animation first.');
  }
}

function describeSelectedCommits() {
  return Object.fromEntries(
    [...useCommitTreeStateStore.getState().getSelectedCommits()].map(([repository, commits]) => [
      repository,
      commits.map(({ commitId }) => commitId),
    ])
  );
}

function isSameSelection(a: Map<string, Commit[]>, b: Map<string, Commit[]>) {
  const keysOf = (selection: Map<string, Commit[]>) =>
    [...selection].flatMap(([repository, commits]) => commits.map(({ commitId }) => `${repository}\0${commitId}`));
  const [keysA, keysB] = [keysOf(a).sort(), keysOf(b).sort()];
  return keysA.length === keysB.length && keysA.every((key, index) => key === keysB[index]);
}

/**
 * Selects the commits in the commit chart and waits until they are rendered.
 * The selection of the repositories that the commits belong to is replaced, the
 * one of other repositories stays. Without commits, the selection is cleared.
 */
export async function selectCommits(hashes: string[], repository?: string) {
  assertNoEvolutionAnimation();

  // Resolve everything first: if one commit is unknown, nothing must change.
  const chart = getCommitChart();
  const requested = new Map<string, Commit[]>();
  for (const hash of hashes) {
    const resolved = resolveCommit(hash, chart, repository);
    const commits = requested.get(resolved.repository) ?? [];
    if (!commits.some(({ commitId }) => commitId === resolved.commit.commitId)) {
      requested.set(resolved.repository, [...commits, resolved.commit]);
    }
  }
  for (const [repoName, commits] of requested) {
    if (commits.length > MAX_SELECTED_COMMITS_PER_REPOSITORY) {
      throw new Error(`At most ${MAX_SELECTED_COMMITS_PER_REPOSITORY} commits of "${repoName}" can be selected.`);
    }
  }

  let selection = new Map(chart.selectedCommits);
  if (hashes.length === 0) {
    if (repository) {
      const repoName = [...chart.commitTrees.keys()].find((name) => name.toLowerCase() === repository.toLowerCase());
      if (!repoName) {
        throw new Error(`Unknown repository "${repository}". Known: ${[...chart.commitTrees.keys()].join(', ')}.`);
      }
      selection.delete(repoName);
    } else {
      selection.clear();
    }
  }
  const store = useCommitTreeStateStore.getState();
  for (const [repoName, commits] of requested) {
    selection.delete(repoName);
    for (const commit of commits) {
      selection = addCommitToSelection(
        selection,
        repoName,
        commit,
        chart.commitTrees,
        store.getXAxisPlacement(),
        MAX_SELECTED_COMMITS_PER_REPOSITORY
      );
    }
  }

  if (isSameSelection(selection, chart.selectedCommits)) {
    return { unchanged: true, selectedCommits: describeSelectedCommits() };
  }

  // Let the chart show the branch that was selected from.
  const [firstRequested] = requested;
  if (firstRequested) {
    const [repoName, commits] = firstRequested;
    store.setCurrentSelectedRepositoryName(repoName);
    const shownBranch = chart.shownBranches.get(repoName);
    if (!commits.some(({ branchName }) => branchName === shownBranch)) {
      store.setSelectedBranchNameForRepo(repoName, commits[0].branchName);
    }
  }

  store.setSelectedCommits(selection);
  await useRenderingServiceStore.getState().triggerRenderingForSelectedCommits();

  // The chart drops commits that its filters hide, also while they are loading.
  if (!isSameSelection(selection, useCommitTreeStateStore.getState().getSelectedCommits())) {
    // Both selections were loaded at the same time: make sure that the current one is visible.
    await useRenderingServiceStore.getState().triggerRenderingForSelectedCommits();
    throw new Error(
      `The selection changed while the commits were loaded, e.g. because a filter of the commit chart hides them. Now selected: ${JSON.stringify(describeSelectedCommits())}.`
    );
  }
  const loaded = useEvolutionDataRepositoryStore.getState().getRepoNameToFlatLandscapeMap();
  if ([...selection.keys()].some((repoName) => !loaded.has(repoName))) {
    throw new Error('The commits are selected, but their data could not be loaded.');
  }
  return { selectedCommits: describeSelectedCommits() };
}

/**
 * Selects a Timestamp in the runtime chart and waits until it is rendered.
 * Without a time, the selection is cleared. As with a click in the chart, the
 * visualization then no longer follows the newest Timestamp.
 */
export async function selectTimestamp(time?: string, commit?: string) {
  assertNoEvolutionAnimation();

  const handler = useRenderingServiceStore.getState()._timelineDataObjectHandler;
  if (!handler) {
    throw new Error('The runtime chart is not available.');
  }

  // Of all timelines, because all of them are rendered together.
  const selection = new Map<string, Timestamp[]>(
    [...handler.timelineDataObject].map(([commitId, { selectedTimestamps }]) => [commitId, selectedTimestamps])
  );

  if (time === undefined) {
    const prefix = commit?.trim().toLowerCase() ?? '';
    const cleared = [...selection.keys()].filter((commitId) => commitId.toLowerCase().startsWith(prefix));
    if (cleared.length === 0) {
      throw new Error('The runtime chart has no such timeline.');
    }
    cleared.forEach((commitId) => selection.set(commitId, []));
  } else {
    const { commitId, timestamp } = resolveTimestamp(time, getRuntimeChart(), commit);
    selection.set(commitId, [timestamp]);
  }

  for (const [commitId, timestamps] of selection) {
    useTimestampStore.getState().setSelectedTimestamps(timestamps, commitId);
  }
  await handler.timelineClicked(selection);

  // Failures while loading are only shown to the user, so compare with what is rendered.
  const rendered = useTimestampStore.getState().timestamp;
  for (const [commitId, timestamps] of selection) {
    if (timestamps[0]?.fromUnixNano !== rendered.get(commitId)?.[0]) {
      throw new Error('The data of the Timestamp could not be loaded.');
    }
  }
  return {
    selectedTimestamps: Object.fromEntries(
      [...selection].map(([commitId, timestamps]) => [
        commitId,
        timestamps.map(({ fromUnixNano }) => toIsoTime(fromUnixNano)),
      ])
    ),
    showsNewestTimestampAutomatically: false,
  };
}
