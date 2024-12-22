import { CommitComparisonMetric } from 'react-lib/src/utils/metric-schemes/metric-data';

export type AppNameCommitTreeMap = Map<string, CommitTree>;

export type CommitTree = {
  name: string;
  branches: Branch[];
};

export type Branch = {
  name: string;
  commits: string[];
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
  modified: string[]; // the component id's from the components of the first commit that got modified in the second commit
  added: string[]; // the component id's from the second commit components that are missing in the first commit
  deleted: string[]; // the component id's from the first commit components that got deleted in the second commit
  addedPackages: string[];
  deletedPackages: string[];
  metrics: CommitComparisonMetric[];
};

export const CROSS_COMMIT_IDENTIFIER = 'cross-commit';
