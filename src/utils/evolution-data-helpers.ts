import {
  Branch,
  Commit,
  CommitNode,
  CommitTree,
  CommitXAxisPlacement,
  NONE_METRIC,
  RepoNameCommitTreeMap,
} from 'explorviz-frontend/src/utils/evolution-schemes/evolution-data';

export type CommitSearchResult = {
  commitId: string;
  branchName: string;
  commitDate?: string;
};

const DEFAULT_MAX_COMMIT_SELECTION = 2;
const DEFAULT_COMMIT_SEARCH_LIMIT = 20;

/** Commit hash to use for source-file links in the current repository selection. */
export function getSourceReferenceCommitHash(
  selectedCommits: Map<string, Commit[]>,
  repositoryName: string
): string | undefined {
  const commitsForRepo = selectedCommits.get(repositoryName);
  if (!commitsForRepo?.length) {
    return undefined;
  }

  if (commitsForRepo.length >= 2) {
    return commitsForRepo[1].commitId;
  }

  return commitsForRepo[0].commitId;
}

export function findRepoNameAndBranchNameForCommit(
  repoCommitMap: RepoNameCommitTreeMap,
  targetCommit: string
): { repoName: string; branchName: string } | undefined {
  for (const [repoName, commitTree] of repoCommitMap.entries()) {
    for (const branch of commitTree.branches) {
      if (branch.commits.some((commit) => commit.hash === targetCommit)) {
        return { repoName, branchName: branch.name };
      }
    }
  }
  return undefined;
}

export function getCommitDateMs(commit: CommitNode): number | null {
  if (commit.commitDate == null) {
    return null;
  }

  const ms = Date.parse(commit.commitDate);
  return Number.isNaN(ms) ? null : ms;
}

export function calculateCommitOffset(
  repoNameCommitTreeMap: RepoNameCommitTreeMap,
  selectedRepoName: string,
  branch: Branch
): number {
  let counter = 0;
  const commitTreeForSelectedRepoName =
    repoNameCommitTreeMap.get(selectedRepoName);

  if (commitTreeForSelectedRepoName) {
    const fromCommit = branch.branchPoint.commit;
    const fromBranch = branch.branchPoint.name;

    if (fromBranch !== 'NONE') {
      for (const b of commitTreeForSelectedRepoName.branches) {
        if (b.name === fromBranch) {
          for (const commit of b.commits) {
            counter++;
            if (commit.hash === fromCommit) {
              counter += calculateCommitOffset(
                repoNameCommitTreeMap,
                selectedRepoName,
                b
              );
              break;
            }
          }
          break;
        }
      }
    }
  }
  return counter;
}

export function getCommitXPosition(
  repoNameCommitTreeMap: RepoNameCommitTreeMap,
  repoName: string,
  branchName: string,
  commitId: string,
  placement: CommitXAxisPlacement = 'equidistant'
): number {
  const commitTree = repoNameCommitTreeMap.get(repoName);
  if (!commitTree) return -1;

  const branch = commitTree.branches.find((b) => b.name === branchName);
  if (!branch) return -1;

  const pointNumber = branch.commits.findIndex(
    (commit) => commit.hash === commitId
  );
  if (pointNumber === -1) return -1;

  if (placement === 'time') {
    const commitDateMs = getCommitDateMs(branch.commits[pointNumber]);
    return commitDateMs ?? pointNumber;
  }

  return (
    pointNumber + calculateCommitOffset(repoNameCommitTreeMap, repoName, branch)
  );
}

export function getCommitXValuesForBranch(
  branch: Branch,
  placement: CommitXAxisPlacement
): number[] {
  return buildBranchChartSeries(branch, placement, NONE_METRIC).xValues;
}

export type BranchChartSeries = {
  commits: CommitNode[];
  xValues: number[];
  yValues: Array<number | null>;
  /** Index of each chart point in the branch's full commit list. */
  originalIndices: number[];
};

export type BranchChartSeriesOptions = {
  metricChangeThreshold?: number;
};

export function getMetricChangeMagnitude(
  commit: CommitNode,
  previousCommit: CommitNode | undefined,
  metricName: string
): number {
  if (!previousCommit) {
    return Number.POSITIVE_INFINITY;
  }

  const current = getMetricValue(commit, metricName);
  const previous = getMetricValue(previousCommit, metricName);

  if (current == null && previous == null) {
    return 0;
  }
  if (current == null || previous == null) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.abs(current - previous);
}

export function meetsMetricChangeThreshold(
  commit: CommitNode,
  previousCommit: CommitNode | undefined,
  metricName: string,
  threshold: number
): boolean {
  if (!previousCommit) {
    return true;
  }

  const magnitude = getMetricChangeMagnitude(
    commit,
    previousCommit,
    metricName
  );

  if (!Number.isFinite(magnitude)) {
    return true;
  }

  return magnitude >= threshold;
}

export function isMetricChangeTriggerAtIndex(
  branch: Branch,
  index: number,
  metricName: string,
  threshold: number
): boolean {
  if (index <= 0) {
    return false;
  }

  return meetsMetricChangeThreshold(
    branch.commits[index],
    branch.commits[index - 1],
    metricName,
    threshold
  );
}

/**
 * For each metric change >= threshold between consecutive commits, keep the
 * commit before and after the change (the pair surrounding the jump).
 */
export function commitHasAnalyzedMetrics(commit: CommitNode): boolean {
  return commit.hasAccumulatedMetrics === true;
}

export function getCommitIndicesWithAnalyzedMetrics(branch: Branch): number[] {
  return branch.commits.reduce<number[]>((indices, commit, index) => {
    if (commitHasAnalyzedMetrics(commit)) {
      indices.push(index);
    }
    return indices;
  }, []);
}

export function getCommitIndicesMeetingMetricChangeThreshold(
  branch: Branch,
  metricName: string,
  threshold: number
): number[] {
  const visibleIndices = new Set<number>();

  for (let index = 1; index < branch.commits.length; index++) {
    const commit = branch.commits[index];
    const previousCommit = branch.commits[index - 1];
    if (
      !commitHasAnalyzedMetrics(commit) ||
      !commitHasAnalyzedMetrics(previousCommit)
    ) {
      continue;
    }

    if (!isMetricChangeTriggerAtIndex(branch, index, metricName, threshold)) {
      continue;
    }

    visibleIndices.add(index - 1);
    visibleIndices.add(index);
  }

  return [...visibleIndices].sort((left, right) => left - right);
}

export function isCommitVisibleWithMetricChangeFilter(
  branch: Branch,
  commitId: string,
  metricName: string,
  threshold: number
): boolean {
  const commitIndex = branch.commits.findIndex(
    (commit) => commit.hash === commitId
  );
  if (
    commitIndex === -1 ||
    !commitHasAnalyzedMetrics(branch.commits[commitIndex])
  ) {
    return false;
  }

  if (threshold <= 0 || metricName === NONE_METRIC) {
    return true;
  }

  return getCommitIndicesMeetingMetricChangeThreshold(
    branch,
    metricName,
    threshold
  ).includes(commitIndex);
}

export function removeFilteredCommitsFromSelection(
  selectedCommits: Map<string, Commit[]>,
  repoName: string,
  repoNameCommitTreeMap: RepoNameCommitTreeMap,
  metricName: string,
  threshold: number
): Map<string, Commit[]> {
  const commitTree = repoNameCommitTreeMap.get(repoName);
  if (!commitTree) {
    return selectedCommits;
  }

  const selectedForRepo = selectedCommits.get(repoName) ?? [];
  if (selectedForRepo.length === 0) {
    return selectedCommits;
  }

  const visibleSelectedCommits = selectedForRepo.filter((commit) => {
    const branch = commitTree.branches.find(
      (candidate) => candidate.name === commit.branchName
    );
    if (!branch) {
      return true;
    }

    return isCommitVisibleWithMetricChangeFilter(
      branch,
      commit.commitId,
      metricName,
      threshold
    );
  });

  if (visibleSelectedCommits.length === selectedForRepo.length) {
    return selectedCommits;
  }

  const newSelectedCommits = new Map(selectedCommits);
  if (visibleSelectedCommits.length === 0) {
    newSelectedCommits.delete(repoName);
  } else {
    newSelectedCommits.set(repoName, visibleSelectedCommits);
  }

  return newSelectedCommits;
}

function buildBranchChartSeriesForIndices(
  branch: Branch,
  placement: CommitXAxisPlacement,
  metricName: string,
  indices: number[]
): BranchChartSeries {
  const commits = indices.map((index) => branch.commits[index]);

  if (placement === 'equidistant') {
    return {
      commits,
      originalIndices: indices,
      xValues: commits.map((_, chartIndex) => chartIndex),
      yValues:
        metricName === NONE_METRIC
          ? commits.map(() => 0)
          : commits.map((commit) => getMetricValue(commit, metricName) ?? null),
    };
  }

  return {
    commits,
    originalIndices: indices,
    xValues: commits.map((commit, chartIndex) => {
      const dateMs = getCommitDateMs(commit);
      return dateMs ?? indices[chartIndex];
    }),
    yValues:
      metricName === NONE_METRIC
        ? commits.map(() => 0)
        : commits.map((commit) => getMetricValue(commit, metricName) ?? null),
  };
}

/** Chart points use branch order; in time mode the x-axis uses commit dates without re-sorting. */
export function buildBranchChartSeries(
  branch: Branch,
  placement: CommitXAxisPlacement,
  metricName: string,
  options: BranchChartSeriesOptions = {}
): BranchChartSeries {
  const shouldFilterByMetricChange =
    options.metricChangeThreshold != null &&
    options.metricChangeThreshold > 0 &&
    metricName !== NONE_METRIC;
  const indices = shouldFilterByMetricChange
    ? getCommitIndicesMeetingMetricChangeThreshold(
        branch,
        metricName,
        options.metricChangeThreshold!
      )
    : getCommitIndicesWithAnalyzedMetrics(branch);

  return buildBranchChartSeriesForIndices(
    branch,
    placement,
    metricName,
    indices
  );
}

export type BranchChartLineSegments = {
  solid: { x: Array<number | null>; y: Array<number | null> };
  dashed: { x: Array<number | null>; y: Array<number | null> };
};

type BranchChartLineSegment = {
  x: number[];
  y: Array<number | null>;
  dashed: boolean;
};

function appendSegmentToTrace(
  traceX: Array<number | null>,
  traceY: Array<number | null>,
  segment: BranchChartLineSegment
) {
  if (traceX.length > 0) {
    traceX.push(null);
    traceY.push(null);
  }

  traceX.push(...segment.x);
  traceY.push(...segment.y);
}

export function buildBranchChartLineSegments(
  xValues: number[],
  yValues: Array<number | null>,
  originalIndices: number[]
): BranchChartLineSegments {
  const segments: BranchChartLineSegment[] = [];

  for (let chartIndex = 1; chartIndex < originalIndices.length; chartIndex++) {
    const previousOriginalIndex = originalIndices[chartIndex - 1];
    const currentOriginalIndex = originalIndices[chartIndex];

    segments.push({
      x: [xValues[chartIndex - 1], xValues[chartIndex]],
      y: [yValues[chartIndex - 1], yValues[chartIndex]],
      dashed: previousOriginalIndex + 1 !== currentOriginalIndex,
    });
  }

  const solid = {
    x: [] as Array<number | null>,
    y: [] as Array<number | null>,
  };
  const dashed = {
    x: [] as Array<number | null>,
    y: [] as Array<number | null>,
  };

  let currentSolidSegment: BranchChartLineSegment | undefined;

  const flushSolidSegment = () => {
    if (!currentSolidSegment) {
      return;
    }

    appendSegmentToTrace(solid.x, solid.y, currentSolidSegment);
    currentSolidSegment = undefined;
  };

  for (const segment of segments) {
    if (segment.dashed) {
      flushSolidSegment();
      appendSegmentToTrace(dashed.x, dashed.y, segment);
      continue;
    }

    if (!currentSolidSegment) {
      currentSolidSegment = {
        x: [...segment.x],
        y: [...segment.y],
        dashed: false,
      };
      continue;
    }

    currentSolidSegment.x.push(segment.x[1]);
    currentSolidSegment.y.push(segment.y[1]);
  }

  flushSolidSegment();

  return { solid, dashed };
}

/** Latest commit on the chart for each repo (maximum Plotly x position). */
export function buildNewestCommitSelectionMap(
  repoNameCommitTreeMap: RepoNameCommitTreeMap,
  placement: CommitXAxisPlacement = 'equidistant'
): Map<string, Commit[]> {
  const result = new Map<string, Commit[]>();

  for (const repoName of repoNameCommitTreeMap.keys()) {
    const commitTree = repoNameCommitTreeMap.get(repoName);
    if (!commitTree?.branches?.length) continue;

    let best: Commit | undefined;
    let bestX = -Infinity;

    for (const branch of commitTree.branches) {
      for (const commit of branch.commits) {
        if (!commitHasAnalyzedMetrics(commit)) {
          continue;
        }

        const x = getCommitXPosition(
          repoNameCommitTreeMap,
          repoName,
          branch.name,
          commit.hash,
          placement
        );
        if (x !== -1 && x >= bestX) {
          bestX = x;
          best = { commitId: commit.hash, branchName: branch.name };
        }
      }
    }

    if (best) {
      result.set(repoName, [best]);
    }
  }

  return result;
}

export function getFirstBranchWithCommits(
  commitTree: { branches: Branch[] } | undefined
): Branch | undefined {
  return commitTree?.branches.find((branch) =>
    branch.commits.some((commit) => commitHasAnalyzedMetrics(commit))
  );
}

export function branchHasAnalyzedCommits(branch: Branch): boolean {
  return branch.commits.some((commit) => commitHasAnalyzedMetrics(commit));
}

export function hasSkippedCommitsBetweenVisiblePoints(
  originalIndices: number[]
): boolean {
  return originalIndices.some(
    (index, chartIndex) =>
      chartIndex > 0 && originalIndices[chartIndex - 1] + 1 !== index
  );
}

export function getMetricValue(
  commit: CommitNode,
  metricName: string
): number | null {
  const value = commit.metrics?.[metricName];
  return value == null || Number.isNaN(value) ? null : value;
}

export function formatCommitDate(commit: CommitNode): string | undefined {
  const commitDateMs = getCommitDateMs(commit);
  if (commitDateMs == null) {
    return undefined;
  }

  return new Date(commitDateMs).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function searchCommitsInRepository(
  commitTree: CommitTree,
  query: string,
  maxResults = DEFAULT_COMMIT_SEARCH_LIMIT
): CommitSearchResult[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return [];
  }

  const results: CommitSearchResult[] = [];

  for (const branch of commitTree.branches) {
    for (const commit of branch.commits) {
      if (
        !commitHasAnalyzedMetrics(commit) ||
        !commit.hash.toLowerCase().includes(normalizedQuery)
      ) {
        continue;
      }

      results.push({
        commitId: commit.hash,
        branchName: branch.name,
        commitDate: formatCommitDate(commit),
      });
    }
  }

  return results.slice(0, maxResults);
}

function sortSelectedCommitsForRepo(
  selectedCommitsForRepo: Commit[],
  repoName: string,
  repoNameCommitTreeMap: RepoNameCommitTreeMap,
  xAxisPlacement: CommitXAxisPlacement
): Commit[] {
  if (selectedCommitsForRepo.length !== 2) {
    return selectedCommitsForRepo;
  }

  return [...selectedCommitsForRepo].sort((a, b) => {
    const xA = getCommitXPosition(
      repoNameCommitTreeMap,
      repoName,
      a.branchName,
      a.commitId,
      xAxisPlacement
    );
    const xB = getCommitXPosition(
      repoNameCommitTreeMap,
      repoName,
      b.branchName,
      b.commitId,
      xAxisPlacement
    );
    return xA - xB;
  });
}

function updateRepoCommitSelection(
  selectedCommits: Map<string, Commit[]>,
  repoName: string,
  selectedCommitsForRepo: Commit[]
): Map<string, Commit[]> {
  const newSelectedCommits = new Map(selectedCommits);

  if (selectedCommitsForRepo.length === 0) {
    newSelectedCommits.delete(repoName);
  } else {
    newSelectedCommits.set(repoName, selectedCommitsForRepo);
  }

  return newSelectedCommits;
}

export function toggleCommitInSelection(
  selectedCommits: Map<string, Commit[]>,
  repoName: string,
  commit: Commit,
  repoNameCommitTreeMap: RepoNameCommitTreeMap,
  xAxisPlacement: CommitXAxisPlacement,
  maxSelection = DEFAULT_MAX_COMMIT_SELECTION
): Map<string, Commit[]> {
  let selectedCommitsForRepo = [...(selectedCommits.get(repoName) || [])];

  const isAlreadySelected = selectedCommitsForRepo.some(
    (selectedCommit) => selectedCommit.commitId === commit.commitId
  );

  if (isAlreadySelected) {
    selectedCommitsForRepo = selectedCommitsForRepo.filter(
      (selectedCommit) => selectedCommit.commitId !== commit.commitId
    );
  } else {
    if (selectedCommitsForRepo.length >= maxSelection) {
      selectedCommitsForRepo.shift();
    }
    selectedCommitsForRepo.push(commit);
  }

  selectedCommitsForRepo = sortSelectedCommitsForRepo(
    selectedCommitsForRepo,
    repoName,
    repoNameCommitTreeMap,
    xAxisPlacement
  );

  return updateRepoCommitSelection(
    selectedCommits,
    repoName,
    selectedCommitsForRepo
  );
}

export function addCommitToSelection(
  selectedCommits: Map<string, Commit[]>,
  repoName: string,
  commit: Commit,
  repoNameCommitTreeMap: RepoNameCommitTreeMap,
  xAxisPlacement: CommitXAxisPlacement,
  maxSelection = DEFAULT_MAX_COMMIT_SELECTION
): Map<string, Commit[]> {
  let selectedCommitsForRepo = [...(selectedCommits.get(repoName) || [])];

  const isAlreadySelected = selectedCommitsForRepo.some(
    (selectedCommit) => selectedCommit.commitId === commit.commitId
  );

  if (isAlreadySelected) {
    return selectedCommits;
  }

  if (selectedCommitsForRepo.length >= maxSelection) {
    selectedCommitsForRepo.shift();
  }
  selectedCommitsForRepo.push(commit);

  selectedCommitsForRepo = sortSelectedCommitsForRepo(
    selectedCommitsForRepo,
    repoName,
    repoNameCommitTreeMap,
    xAxisPlacement
  );

  return updateRepoCommitSelection(
    selectedCommits,
    repoName,
    selectedCommitsForRepo
  );
}
