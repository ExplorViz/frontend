import { CommitComparisonMetric } from 'explorviz-frontend/src/utils/metric-schemes/metric-data';

export type RepoNameCommitTreeMap = Map<string, CommitTree>;

export type CommitTree = {
  name: string;
  branches: Branch[];
  remoteUrl?: string;
};

export type CommitXAxisPlacement = 'equidistant' | 'time';

export type CommitNode = {
  hash: string;
  commitDate?: string;
  metrics?: Record<string, number>;
  hasAccumulatedMetrics?: boolean;
  tags?: string[];
};

export type Branch = {
  name: string;
  commits: CommitNode[];
  branchPoint: BranchPoint;
};

export type BranchPoint = {
  name: string;
  commit: string;
};

export type Commit = {
  commitId: string;
  branchName: string;
};

export type CommitComparison = {
  modified: string[];
  added: string[];
  deleted: string[];
  addedPackages: string[];
  deletedPackages: string[];
  metrics: CommitComparisonMetric[];
};

export const CROSS_COMMIT_IDENTIFIER = 'cross-commit';

export const NONE_METRIC = 'None';

const NO_BRANCH_POINT: BranchPoint = { name: 'NONE', commit: '' };

export function getCommitHash(commit: CommitNode | string): string {
  return typeof commit === 'string' ? commit : commit.hash;
}

/** Normalizes legacy string commits and fills defaults for the branch-based metrics chart. */
export function normalizeCommitNode(commit: CommitNode | string): CommitNode {
  if (typeof commit === 'string') {
    return { hash: commit, hasAccumulatedMetrics: false };
  }

  const metrics =
    commit.metrics && Object.keys(commit.metrics).length > 0
      ? commit.metrics
      : undefined;

  const tags =
    commit.tags?.filter((tag) => tag.trim().length > 0).sort((a, b) =>
      a.localeCompare(b)
    ) ?? [];

  return {
    hash: commit.hash,
    ...(commit.commitDate != null && { commitDate: commit.commitDate }),
    ...(metrics && { metrics }),
    ...(tags.length > 0 && { tags }),
    hasAccumulatedMetrics:
      commit.hasAccumulatedMetrics ??
      (metrics != null && Object.keys(metrics).length > 0),
  };
}

export function normalizeCommitTree(
  tree: Partial<CommitTree> | null | undefined,
  repositoryName = ''
): CommitTree {
  return {
    name: tree?.name ?? repositoryName,
    ...(tree?.remoteUrl != null && { remoteUrl: tree.remoteUrl }),
    branches: (tree?.branches ?? []).map((branch) => ({
      name: branch.name,
      branchPoint: branch.branchPoint ?? NO_BRANCH_POINT,
      commits: (branch.commits ?? []).map((commit) =>
        normalizeCommitNode(commit as CommitNode | string)
      ),
    })),
  };
}

export function collectUniqueCommitHashes(tree: CommitTree): Set<string> {
  const hashes = new Set<string>();
  for (const branch of tree.branches) {
    for (const commit of branch.commits) {
      hashes.add(commit.hash);
    }
  }
  return hashes;
}

export function getAvailableMetricNames(branch: Branch): string[] {
  const names = new Set<string>();
  for (const commit of branch.commits) {
    if (commit.metrics) {
      Object.keys(commit.metrics).forEach((name) => names.add(name));
    }
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

export function getDefaultMetricName(branch: Branch): string {
  const availableMetrics = getAvailableMetricNames(branch);
  if (availableMetrics.includes('lineCount')) {
    return 'lineCount';
  }
  if (availableMetrics.length > 0) {
    return availableMetrics[0];
  }
  return NONE_METRIC;
}
