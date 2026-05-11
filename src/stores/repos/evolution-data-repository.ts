import { SelectedCommit } from 'explorviz-frontend/src/stores/commit-tree-state';
import { useEvolutionDataFetchServiceStore } from 'explorviz-frontend/src/stores/evolution-data-fetch-service';
import { getCommitXPosition } from 'explorviz-frontend/src/utils/evolution-data-helpers';
import {
  CommitTree,
  RepoNameCommitTreeMap,
} from 'explorviz-frontend/src/utils/evolution-schemes/evolution-data';
import { FlatLandscape } from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import { create } from 'zustand';

/** Older commit first, newer second — matches persistence-service comparison semantics. */
function sortSelectedCommitsForComparison(
  repoNameCommitTreeMap: RepoNameCommitTreeMap,
  repositoryName: string,
  commits: SelectedCommit[]
): SelectedCommit[] {
  if (commits.length !== 2) {
    return commits;
  }
  return [...commits].sort(
    (a, b) =>
      getCommitXPosition(
        repoNameCommitTreeMap,
        repositoryName,
        a.branchName,
        a.commitId
      ) -
      getCommitXPosition(
        repoNameCommitTreeMap,
        repositoryName,
        b.branchName,
        b.commitId
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
    repoName: string
  ) => Promise<CommitTree | undefined>;
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
        const repositoryNames = await useEvolutionDataFetchServiceStore
          .getState()
          .fetchRepositories();
        const repoNameCommitTreeMap: RepoNameCommitTreeMap = new Map();

        for (const repoName of repositoryNames) {
          const commitTree = await get()._fetchCommitTreeForRepoName(repoName);
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

    resetAllEvolutionData: (): void => {
      get().resetRepoNameCommitTreeMap();
    },

    resetRepoNameCommitTreeMap: () => {
      set({ _repoNameCommitTreeMap: new Map() });
    },

    _fetchCommitTreeForRepoName: async (
      repoName: string
    ): Promise<CommitTree | undefined> => {
      try {
        return await useEvolutionDataFetchServiceStore
          .getState()
          .fetchCommitTreeForRepoName(repoName);
      } catch (reason) {
        console.error(
          `Failed to fetch Commit Tree for repoName: ${repoName}, reason: ${reason}`
        );
        return undefined;
      }
    },
  }));
