import {
  SelectedCommit
} from 'explorviz-frontend/src/stores/commit-tree-state';
import { useEvolutionDataFetchServiceStore } from 'explorviz-frontend/src/stores/evolution-data-fetch-service';
import {
  CommitTree,
  RepoNameCommitTreeMap
} from 'explorviz-frontend/src/utils/evolution-schemes/evolution-data';
import { FlatLandscape } from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import { create } from 'zustand';

interface EvolutionDataRepositoryState {
  _repoNameCommitTreeMap: RepoNameCommitTreeMap;
  _repoNameToFlatLandscapeMap: Map<string, FlatLandscape>;
  getRepoNameToFlatLandscapeMap: () => Map<string, FlatLandscape>;
  fetchAndStoreRepositoryCommitTrees: () => Promise<boolean>;
  fetchAndStoreEvolutionDataForSelectedCommits: (
      repositoryName: string,
      selectedCommits: SelectedCommit[]
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

          set({ _repoNameCommitTreeMap: repoNameCommitTreeMap});
      
      } catch (error) {
        get().resetRepoNameCommitTreeMap();
        console.error(`Failed to build RepoNameCommitTreeMap, reason: ${error}`);
        return false;
      }

      return true;
    },

    fetchAndStoreEvolutionDataForSelectedCommits: async (
      repositoryName: string,
      selectedCommits: SelectedCommit[]
    ): Promise<void> => {
        const newRepoNameToFlatLandscapeMap = get()._repoNameToFlatLandscapeMap;
        try {
          const structureLandscapeData = await useEvolutionDataFetchServiceStore.getState()
            .fetchFlatLandscapeForRepoNameAndCommits(repositoryName, selectedCommits);

          newRepoNameToFlatLandscapeMap.set(repositoryName, structureLandscapeData);
        } catch (error) {
          console.error(
            `Failed to fetch and set flat landscape data for repo: ${repositoryName}, reason: ${error}`
          );
        }
        set({ _repoNameToFlatLandscapeMap: newRepoNameToFlatLandscapeMap });
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
