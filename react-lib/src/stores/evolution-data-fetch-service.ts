import { createStore } from 'zustand/vanilla';
import {
  Commit,
  CommitComparison,
  CommitTree,
} from 'react-lib/src/utils/evolution-schemes/evolution-data';
import { ApplicationMetricsCode } from '../utils/metric-schemes/metric-data';
import { SelectedCommit } from 'react-lib/src/stores/commit-tree-state';
import {
  preProcessAndEnhanceStructureLandscape,
  StructureLandscapeData,
  TypeOfAnalysis,
} from 'react-lib/src/utils/landscape-schemes/structure-data';

interface EvolutionDataFetchState {
  //   fetchApplication: () => Promise<string[]>;
  //   fetchCommitTreeForAppName(appName: string): Promise<CommitTree>;
  //   fetchApplicationMetricsCodeForAppNameAndCommit(
  //     applicationName: string,
  //     commit: Commit
  //   ): Promise<ApplicationMetricsCode>;
  //   fetchApplicationMetricsCodeForAppAndCommits(
  //     applicationName: string,
  //     commits: SelectedCommit[]
  //   ): Promise<Map<string, ApplicationMetricsCode>>;
  //   fetchCommitComparison(
  //     applicationName: string,
  //     baseCommit: Commit,
  //     comparisonCommit: Commit
  //   ): Promise<CommitComparison>;
  //   fetchStaticLandscapeStructuresForAppName(
  //     applicationName: string,
  //     commits: SelectedCommit[]
  //   ): Promise<StructureLandscapeData>;
  //   getLandscapeToken(): string;
  //   constructUrl(endpoint: string, ...params: string[]): string;
  //   fetchFromService<T>(url: string): Promise<T>;
}

export const useEvolutionDataFetchServiceStore =
  createStore<EvolutionDataFetchState>((set, get) => ({}));
