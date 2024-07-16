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
