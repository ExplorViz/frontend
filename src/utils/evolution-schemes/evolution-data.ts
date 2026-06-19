import { CommitComparisonMetric } from 'explorviz-frontend/src/utils/metric-schemes/metric-data';

export type RepoNameCommitTreeMap = Map<string, CommitTree>;

export type CommitTree = {
  name: string;
  branches: Branch[];
};

export type CommitNode = {
  hash: string;
  metrics?: Record<string, number>;
  hasAccumulatedMetrics?: boolean;
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
