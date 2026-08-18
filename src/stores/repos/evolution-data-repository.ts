import {
  SelectedCommit,
  useCommitTreeStateStore,
} from 'explorviz-frontend/src/stores/commit-tree-state';
import {
  SocialMetricDto,
  useEvolutionDataFetchServiceStore,
} from 'explorviz-frontend/src/stores/evolution-data-fetch-service';
import { getCommitXPosition } from 'explorviz-frontend/src/utils/evolution-data-helpers';
import {
  CommitTree,
  CommitTreeFilterOptions,
  RepoNameCommitTreeMap,
} from 'explorviz-frontend/src/utils/evolution-schemes/evolution-data';
import { FlatLandscape } from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import { mergeSocialMetricsIntoFlatLandscape } from 'explorviz-frontend/src/utils/landscape-schemes/social-metrics-helpers';
import { create } from 'zustand';

/** Older commit first, newer second — matches landscape-service comparison semantics. */
export function sortSelectedCommitsForComparison(
  repoNameCommitTreeMap: RepoNameCommitTreeMap,
  repositoryName: string,
  commits: SelectedCommit[]
): SelectedCommit[] {
  if (commits.length !== 2) {
    return commits;
  }

  const xAxisPlacement = useCommitTreeStateStore.getState().getXAxisPlacement();
  return [...commits].sort(
    (a, b) =>
      getCommitXPosition(
        repoNameCommitTreeMap,
        repositoryName,
        a.branchName,
        a.commitId,
        xAxisPlacement
      ) -
      getCommitXPosition(
        repoNameCommitTreeMap,
        repositoryName,
        b.branchName,
        b.commitId,
        xAxisPlacement
      )
  );
}

interface EvolutionDataRepositoryState {
  _repoNameCommitTreeMap: RepoNameCommitTreeMap;
  _repoNameToFlatLandscapeMap: Map<string, FlatLandscape>;
  getRepoNameToFlatLandscapeMap: () => Map<string, FlatLandscape>;
  fetchAndStoreRepositoryCommitTrees: () => Promise<boolean>;
  fetchAndStoreEvolutionDataForSelectedCommits: (
    repoNameToSelectedCommits: Map<string, SelectedCommit[]>
  ) => Promise<void>;
  resetAllEvolutionData: () => void;
  resetRepoNameCommitTreeMap: () => void;
  _fetchCommitTreeForRepoName: (
    repoName: string,
    filters?: CommitTreeFilterOptions
  ) => Promise<CommitTree | undefined>;
  sortSelectedCommitsForComparison: (
    repoNameCommitTreeMap: RepoNameCommitTreeMap,
    repositoryName: string,
    commits: SelectedCommit[]
  ) => SelectedCommit[];
  applySocialMetrics: (dtos: SocialMetricDto[]) => void;
}

export const useEvolutionDataRepositoryStore =
  create<EvolutionDataRepositoryState>((set, get) => ({
    _repoNameCommitTreeMap: new Map<string, CommitTree>(),
    _repoNameToFlatLandscapeMap: new Map<string, FlatLandscape>(),

    getRepoNameToFlatLandscapeMap: (): Map<string, FlatLandscape> => {
      return get()._repoNameToFlatLandscapeMap;
    },

    fetchAndStoreRepositoryCommitTrees: async (): Promise<boolean> => {
      try {
        const filters = useCommitTreeStateStore
          .getState()
          .getCommitTreeFilters();
        const filterOptions: CommitTreeFilterOptions = {
          fromTimestamp: filters.fromTimestamp,
          toTimestamp: filters.toTimestamp,
          sampling: filters.sampling,
        };
        const repositoryNames = await useEvolutionDataFetchServiceStore
          .getState()
          .fetchRepositories();
        const repoNameCommitTreeMap: RepoNameCommitTreeMap = new Map();

        for (const repoName of repositoryNames) {
          const commitTree = await get()._fetchCommitTreeForRepoName(
            repoName,
            filterOptions
          );
          if (commitTree) {
            repoNameCommitTreeMap.set(repoName, commitTree);
          }
        }

        set({ _repoNameCommitTreeMap: repoNameCommitTreeMap });
      } catch (error) {
        get().resetRepoNameCommitTreeMap();
        console.error(
          `Failed to build RepoNameCommitTreeMap, reason: ${error}`
        );
        return false;
      }

      return true;
    },

    fetchAndStoreEvolutionDataForSelectedCommits: async (
      repoNameToSelectedCommits: Map<string, SelectedCommit[]>
    ): Promise<void> => {
      const selections = Array.from(repoNameToSelectedCommits.entries()).filter(
        ([, commits]) => commits.length >= 1 && commits.length <= 2
      );

      if (selections.length === 0) {
        set({ _repoNameToFlatLandscapeMap: new Map<string, FlatLandscape>() });
        return;
      }

      const repoNameCommitTreeMap = get()._repoNameCommitTreeMap;

      try {
        const body = {
          repositories: selections.map(([repositoryName, commits]) => ({
            repositoryName,
            commitHashes: sortSelectedCommitsForComparison(
              repoNameCommitTreeMap,
              repositoryName,
              commits
            ).map((c) => c.commitId),
          })),
        };

        const structureLandscapeData = await useEvolutionDataFetchServiceStore
          .getState()
          .fetchFlatLandscapeForRepositoriesAndCommits(body);

        const newRepoNameToFlatLandscapeMap = new Map<string, FlatLandscape>();
        for (const [repoName] of selections) {
          newRepoNameToFlatLandscapeMap.set(repoName, structureLandscapeData);
        }

        set({ _repoNameToFlatLandscapeMap: newRepoNameToFlatLandscapeMap });
      } catch (error) {
        console.error(
          `Failed to fetch evolution structure batch for repositories: ${selections
            .map(([name]) => name)
            .join(', ')}, reason: ${error}`
        );
        set({ _repoNameToFlatLandscapeMap: new Map<string, FlatLandscape>() });
      }
    },

    applySocialMetrics: (dtos: SocialMetricDto[]): void => {
      const merged = new Map<string, FlatLandscape>();

      for (const [repoName, flatLandscape] of get()
        ._repoNameToFlatLandscapeMap) {
        merged.set(
          repoName,
          mergeSocialMetricsIntoFlatLandscape(flatLandscape, dtos)
        );
      }

      set({ _repoNameToFlatLandscapeMap: merged });
    },

    resetAllEvolutionData: (): void => {
      get().resetRepoNameCommitTreeMap();
    },

    resetRepoNameCommitTreeMap: () => {
      set({ _repoNameCommitTreeMap: new Map() });
    },

    _fetchCommitTreeForRepoName: async (
      repoName: string,
      filters?: CommitTreeFilterOptions
    ): Promise<CommitTree | undefined> => {
      try {
        return await useEvolutionDataFetchServiceStore
          .getState()
          .fetchCommitTreeForRepoName(repoName, filters);
      } catch (reason) {
        console.error(
          `Failed to fetch Commit Tree for repoName: ${repoName}, reason: ${reason}`
        );
        return undefined;
      }
    },
  }));
