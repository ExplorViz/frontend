import { useRenderingServiceStore } from 'explorviz-frontend/src/stores/rendering-service';
import { useTimestampStore } from 'explorviz-frontend/src/stores/timestamp';
import { useVisibilityServiceStore } from 'explorviz-frontend/src/stores/visibility-service';
import {
  findRepoNameAndBranchNameForCommit,
  getCommitXPosition,
} from 'explorviz-frontend/src/utils/evolution-data-helpers';
import {
  Commit,
  RepoNameCommitTreeMap,
} from 'explorviz-frontend/src/utils/evolution-schemes/evolution-data';
import { create } from 'zustand';

export type SelectedCommit = Commit;

interface CommitTreeStateState {
  _selectedCommits: Map<string, SelectedCommit[]>; // tracked
  _repoNameAndBranchNameToColorMap: Map<string, string>;
  _currentSelectedRepositoryName: string;
  getSelectedCommits: () => Map<string, Commit[]>;
  getCurrentSelectedRepositoryName: () => string;
  setDefaultState: (
    currentRepoNameCommitTreeMap: RepoNameCommitTreeMap,
    commit1: string,
    commit2: string | null | undefined
  ) => boolean;
  setCurrentSelectedRepositoryName: (repoName: string) => void;
  setSelectedCommits: (
    newSelectedCommits: Map<string, SelectedCommit[]>
  ) => void;
  resetSelectedCommits: () => void;
  getCloneOfRepoNameAndBranchNameToColorMap: () => Map<string, string>;
  setRepoNameAndBranchNameToColorMap: (
    newRepoNameAndBranchNameToColorMap: Map<string, string>
  ) => void;
}

const getAutoEvolutionRenderingConfiguration = (
  selectedCommits: Map<string, SelectedCommit[]>,
  selectedTimestamps: Map<string, number[]>
) => {
  const totalSelectedCommitCount = Array.from(selectedCommits.values()).reduce(
    (acc, commits) => acc + commits.length,
    0
  );
  const hasSelectedCommit = totalSelectedCommitCount > 0;

  const hasSelectedTimestamp = Array.from(selectedTimestamps.values()).some(
    (timestamps) => timestamps.length > 0
  );

  const hasTwoCommitsInAnyRepository = Array.from(
    selectedCommits.values()
  ).some((commits) => commits.length >= 2);

  const hasAtMostOneCommitPerRepository = Array.from(
    selectedCommits.values()
  ).every((commits) => commits.length <= 1);

  if (hasSelectedTimestamp && !hasSelectedCommit) {
    return {
      renderDynamic: true,
      renderStatic: false,
      renderOnlyDifferences: false,
    };
  }

  if (!hasSelectedTimestamp && hasTwoCommitsInAnyRepository) {
    return {
      renderDynamic: false,
      renderStatic: true,
      renderOnlyDifferences: true,
    };
  }

  if (hasSelectedTimestamp && hasSelectedCommit) {
    return {
      renderDynamic: true,
      renderStatic: true,
      renderOnlyDifferences: false,
    };
  }

  if (
    !hasSelectedTimestamp &&
    hasSelectedCommit &&
    hasAtMostOneCommitPerRepository
  ) {
    return {
      renderDynamic: false,
      renderStatic: true,
      renderOnlyDifferences: false,
    };
  }

  return {
    renderDynamic: true,
    renderStatic: false,
    renderOnlyDifferences: false,
  };
};

export const useCommitTreeStateStore = create<CommitTreeStateState>(
  (set, get) => ({
    _selectedCommits: new Map(),
    _repoNameAndBranchNameToColorMap: new Map(),
    _currentSelectedRepositoryName: '',

    getSelectedCommits: () => {
      return get()._selectedCommits;
    },

    getCurrentSelectedRepositoryName: () => {
      return get()._currentSelectedRepositoryName;
    },

    setDefaultState(
      currentRepoNameCommitTreeMap: RepoNameCommitTreeMap,
      commit1: string,
      commit2: string | null | undefined
    ): boolean {
      const defaultSelectedCommits = new Map<string, SelectedCommit[]>();

      // Find repo and branch of first commit
      const commit1RepoAndBranch = findRepoNameAndBranchNameForCommit(
        currentRepoNameCommitTreeMap,
        commit1
      );
      if (!commit1RepoAndBranch) {
        return false;
      }

      defaultSelectedCommits.set(commit1RepoAndBranch.repoName, [
        {
          commitId: commit1,
          branchName: commit1RepoAndBranch.branchName,
        },
      ]);

      if (commit2) {
        // Find repo and branch of second commit
        const commit2RepoAndBranch = findRepoNameAndBranchNameForCommit(
          currentRepoNameCommitTreeMap,
          commit2
        );
        if (commit2RepoAndBranch) {
          if (!defaultSelectedCommits.has(commit2RepoAndBranch.repoName)) {
            defaultSelectedCommits.set(commit2RepoAndBranch.repoName, []);
          }
          defaultSelectedCommits.get(commit2RepoAndBranch.repoName)?.push({
            commitId: commit2,
            branchName: commit2RepoAndBranch.branchName,
          });
        }
      }

      // Sort commits within each repo if there are two
      for (const [repoName, commits] of defaultSelectedCommits.entries()) {
        if (commits.length === 2) {
          commits.sort((a, b) => {
            const xA = getCommitXPosition(
              currentRepoNameCommitTreeMap,
              repoName,
              a.branchName,
              a.commitId
            );
            const xB = getCommitXPosition(
              currentRepoNameCommitTreeMap,
              repoName,
              b.branchName,
              b.commitId
            );
            return xA - xB;
          });
        }
      }

      get().setSelectedCommits(defaultSelectedCommits);
      set({ _currentSelectedRepositoryName: commit1RepoAndBranch.repoName });
      return true;
    },

    setCurrentSelectedRepositoryName: (repoName: string) => {
      if (get()._currentSelectedRepositoryName != repoName) {
        set({ _currentSelectedRepositoryName: repoName });
      }
    },

    setSelectedCommits: (newSelectedCommits: Map<string, SelectedCommit[]>) => {
      set({ _selectedCommits: newSelectedCommits });
      const selectedTimestamps = useTimestampStore.getState().timestamp;
      const previousConfig = useVisibilityServiceStore
        .getState()
        .getCloneOfEvolutionModeRenderingConfiguration();
      const autoConfig = getAutoEvolutionRenderingConfiguration(
        newSelectedCommits,
        selectedTimestamps
      );
      const hasTwoCommitsInAnyRepository = Array.from(
        newSelectedCommits.values()
      ).some((commits) => commits.length >= 2);
      const mergedConfig = {
        ...autoConfig,
        removeUnchangedFromLayout: hasTwoCommitsInAnyRepository
          ? previousConfig.removeUnchangedFromLayout
          : false,
      };
      useVisibilityServiceStore
        .getState()
        .applyEvolutionModeRenderingConfiguration(mergedConfig);
      useRenderingServiceStore
        .getState()
        .setAnalysisModeFromEvolutionRenderingConfig(mergedConfig);
    },

    resetSelectedCommits: () => {
      get().setSelectedCommits(new Map());
    },

    getCloneOfRepoNameAndBranchNameToColorMap: () => {
      return structuredClone(get()._repoNameAndBranchNameToColorMap);
    },

    setRepoNameAndBranchNameToColorMap: (
      newRepoNameAndBranchNameToColorMap: Map<string, string>
    ) => {
      set({
        _repoNameAndBranchNameToColorMap: newRepoNameAndBranchNameToColorMap,
      });
    },
  })
);
