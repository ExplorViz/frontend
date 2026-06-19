import {
  Branch,
  Commit,
  CommitNode,
  RepoNameCommitTreeMap,
} from 'explorviz-frontend/src/utils/evolution-schemes/evolution-data';

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
  commitId: string
): number {
  const commitTree = repoNameCommitTreeMap.get(repoName);
  if (!commitTree) return -1;

  const branch = commitTree.branches.find((b) => b.name === branchName);
  if (!branch) return -1;

  const pointNumber = branch.commits.findIndex(
    (commit) => commit.hash === commitId
  );
  if (pointNumber === -1) return -1;

  return (
    pointNumber + calculateCommitOffset(repoNameCommitTreeMap, repoName, branch)
  );
}

/** Latest commit on the chart for each repo (maximum Plotly x position). */
export function buildNewestCommitSelectionMap(
  repoNameCommitTreeMap: RepoNameCommitTreeMap
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
          commit.hash
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
