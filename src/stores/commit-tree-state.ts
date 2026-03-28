import { useVisibilityServiceStore } from 'explorviz-frontend/src/stores/visibility-service';
import { findRepoNameAndBranchNameForCommit } from 'explorviz-frontend/src/utils/evolution-data-helpers';
import {
  Commit,
  RepoNameCommitTreeMap
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

      set({ _selectedCommits: defaultSelectedCommits });
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
      // Show everything by default
      if (newSelectedCommits.size === 0) {
        useVisibilityServiceStore
          .getState()
          .applyEvolutionModeRenderingConfiguration({
            renderDynamic: true,
            renderStatic: true,
            renderOnlyDifferences: false,
          });
      }
    },

    resetSelectedCommits: () => {
      set({ _selectedCommits: new Map() });
      // Show everything by default
      useVisibilityServiceStore
        .getState()
        .applyEvolutionModeRenderingConfiguration({
          renderDynamic: true,
          renderStatic: true,
          renderOnlyDifferences: false,
        });
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
