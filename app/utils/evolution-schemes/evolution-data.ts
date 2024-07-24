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

export const CROSS_COMMIT_IDENTIFIER = 'cross-commit';
