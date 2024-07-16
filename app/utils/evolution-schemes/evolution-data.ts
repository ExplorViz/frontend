export type EvolutionLandscapeData = Map<string, EvolutedApplication>;

export type EvolutedApplication = {
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
