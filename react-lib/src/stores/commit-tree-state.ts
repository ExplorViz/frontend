import { createStore } from 'zustand/vanilla';
import {
  AppNameCommitTreeMap,
  Commit,
} from 'react-lib/src/utils/evolution-schemes/evolution-data';
import { findAppNameAndBranchNameForCommit } from 'react-lib/src/utils/evolution-data-helpers';

export type SelectedCommit = Commit;

interface CommitTreeStateState {
  _selectedCommits: Map<string, SelectedCommit[]>; // tracked
  _appNameAndBranchNameToColorMap: Map<string, string>;
  _currentSelectedApplicationName: string; // tracked
  getSelectedCommits: () => Map<string, Commit[]>;
  getCurrentSelectedApplicationName: () => string;
  setDefaultState: (
    currentAppNameCommitTreeMap: AppNameCommitTreeMap,
    commit1: string,
    commit2: string | null | undefined
  ) => boolean;
  setCurrentSelectedApplicationName: (appName: string) => void;
  setSelectedCommits: (
    newSelectedCommits: Map<string, SelectedCommit[]>
  ) => void;
  resetSelectedCommits: () => void;
  getCloneOfAppNameAndBranchNameToColorMap: () => Map<string, string>;
  setAppNameAndBranchNameToColorMap: (
    newAppNameAndBranchNameToColorMap: Map<string, string>
  ) => void;
}

export const useCommitTreeStateStore = createStore<CommitTreeStateState>(
  (set, get) => ({
    _selectedCommits: new Map(),
    _appNameAndBranchNameToColorMap: new Map(),
    _currentSelectedApplicationName: '',

    getSelectedCommits: () => {
      return get()._selectedCommits;
    },

    getCurrentSelectedApplicationName: () => {
      return get()._currentSelectedApplicationName;
    },

    setDefaultState(
      currentAppNameCommitTreeMap: AppNameCommitTreeMap,
      commit1: string,
      commit2: string | null | undefined
    ): boolean {
      const defaultSelectedCommits = new Map<string, SelectedCommit[]>();

      // Find app and branch of first commit
      const commit1AppAndBranch = findAppNameAndBranchNameForCommit(
        currentAppNameCommitTreeMap,
        commit1
      );
      if (!commit1AppAndBranch) {
        return false;
      }

      defaultSelectedCommits.set(commit1AppAndBranch.appName, [
        {
          commitId: commit1,
          branchName: commit1AppAndBranch.branchName,
        },
      ]);

      if (commit2) {
        // Find app and branch of second commit
        const commit2AppAndBranch = findAppNameAndBranchNameForCommit(
          currentAppNameCommitTreeMap,
          commit2
        );
        if (commit2AppAndBranch) {
          if (!defaultSelectedCommits.has(commit2AppAndBranch.appName)) {
            defaultSelectedCommits.set(commit2AppAndBranch.appName, []);
          }
          defaultSelectedCommits.get(commit2AppAndBranch.appName)?.push({
            commitId: commit2,
            branchName: commit2AppAndBranch.branchName,
          });
        }
      }

      this._selectedCommits = defaultSelectedCommits;
      this._currentSelectedApplicationName = commit1AppAndBranch.appName;
      return true;
    },

    setCurrentSelectedApplicationName: (appName: string) => {
      if (get()._currentSelectedApplicationName !== appName) {
        // don't trigger unnecessary rerendering of components
        set({ _currentSelectedApplicationName: appName });
      }
    },

    setSelectedCommits: (newSelectedCommits: Map<string, SelectedCommit[]>) => {
      set({ _selectedCommits: newSelectedCommits });
    },

    resetSelectedCommits: () => {
      set({ _selectedCommits: new Map() });
    },

    getCloneOfAppNameAndBranchNameToColorMap: () => {
      return structuredClone(get()._appNameAndBranchNameToColorMap);
    },

    setAppNameAndBranchNameToColorMap: (
      newAppNameAndBranchNameToColorMap: Map<string, string>
    ) => {
      set({
        _appNameAndBranchNameToColorMap: newAppNameAndBranchNameToColorMap,
      });
    },
  })
);
