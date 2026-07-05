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
};

/** Chart points use branch order; in time mode the x-axis uses commit dates without re-sorting. */
export function buildBranchChartSeries(
  branch: Branch,
  placement: CommitXAxisPlacement,
  metricName: string
): BranchChartSeries {
  if (placement === 'equidistant') {
    return {
      commits: branch.commits,
      xValues: branch.commits.map((_, index) => index),
      yValues:
        metricName === NONE_METRIC
          ? branch.commits.map(() => 0)
          : branch.commits.map(
              (commit) => getMetricValue(commit, metricName) ?? null
            ),
    };
  }

  return {
    commits: branch.commits,
    xValues: branch.commits.map((commit, index) => {
      const dateMs = getCommitDateMs(commit);
      return dateMs ?? index;
    }),
    yValues:
      metricName === NONE_METRIC
        ? branch.commits.map(() => 0)
        : branch.commits.map(
            (commit) => getMetricValue(commit, metricName) ?? null
          ),
  };
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
  return commitTree?.branches.find((branch) => branch.commits.length > 0);
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
      if (!commit.hash.toLowerCase().includes(normalizedQuery)) {
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
