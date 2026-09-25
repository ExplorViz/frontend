import { CommitComparison, FlatLandscape } from './flat-landscape';

export type AnimationFrame = {
  commitHash: string;
  authorDate: number; // epoch ms → new Date(authorDate)
  ordinal: number; // global index in commit history (authorDate ASC)
  landscape: FlatLandscape;
};

export type AnimationWindow = {
  totalCount: number;
  windowStart: number;
  frames: AnimationFrame[];
};

export type AnimationSkeleton = {
  landscape: FlatLandscape;
  fqnToFirstOrdinal: Record<string, number>;
  orderedCommitHashes: string[];
  orderedCommitTimestamps: number[];
};

export type BuildingState = {
  fqn: string;
  lastChangeOrdinal: number;
  lastChangeDate: number;
  lastAction: CommitComparison;
};

export type BuildingChange = {
  fqn: string;
  action: CommitComparison;
};

export type AnimationDeltaFrame = {
  commitHash: string;
  authorDate: number;
  ordinal: number;
  keyframe: boolean;
  tsFrom: number;
  tsTo: number;
  commitCount: number;
  state: BuildingState[] | null;
  changes: BuildingChange[] | null;
};

export type AnimationDeltaWindow = {
  totalCount: number;
  windowStart: number;
  frames: AnimationDeltaFrame[];
};
