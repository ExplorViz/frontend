import { createStore } from 'zustand/vanilla';
import {
    AppNameCommitTreeMap,
    Commit,
  } from 'react-lib/src/utils/evolution-schemes/evolution-data';
import { findAppNameAndBranchNameForCommit } from 'react-lib/src/utils/evolution-data-helpers';


export type SelectedCommit = Commit;

interface CommitTreeStateState {
    _selectedCommits: Map<string, SelectedCommit[]>; // tracked
    _appNameAndBranchNameToColorMap: Map<string, string> ;
    _currentSelectedApplicationName: string; // tracked
    getSelectedCommits: () => Map<string, Commit[]>;
    getCurrentSelectedApplicationName: () => string;
    setDefaultState: (
        currentAppNameCommitTreeMap: AppNameCommitTreeMap,
        commit1: string,
        commit2: string | null | undefined
      ) => boolean;
    setCurrentSelectedApplicationName: (appName: string) => void;
    setSelectedCommits: (newSelectedCommits: Map<string, SelectedCommit[]>) => void;
    resetSelectedCommits: () => void;
    getCloneOfAppNameAndBranchNameToColorMap: () => Map<string, string>;
    setAppNameAndBranchNameToColorMap: (newAppNameAndBranchNameToColorMap: Map<string, string>) => void;
}

export const useCommitTreeStateStore = createStore<CommitTreeStateState>((set, get) => ({
    _selectedCommits: new Map(),
    _appNameAndBranchNameToColorMap: new Map(),
    _currentSelectedApplicationName: '',

    getSelectedCommits: () => {
        return get()._selectedCommits;
    },

    getCurrentSelectedApplicationName: () => {
        return get()._currentSelectedApplicationName;
    },

    setDefaultState: (
        currentAppNameCommitTreeMap: AppNameCommitTreeMap,
        commit1: string,
        commit2: string | null | undefined
      ): boolean => {
        const defaultSelectedCommits = new Map<string, SelectedCommit[]>();
    
        // Find location for commit1
        const commit1Location = findAppNameAndBranchNameForCommit(
          currentAppNameCommitTreeMap,
          commit1
        );
        if (commit1Location) {
          if (!defaultSelectedCommits.has(commit1Location.appName)) {
            defaultSelectedCommits.set(commit1Location.appName, []);
          }
          defaultSelectedCommits.get(commit1Location.appName)?.push({
            commitId: commit1,
            branchName: commit1Location.branchName,
          });
    
          // Find location for commit2 if commit1 was found and commit2 is not null or undefined
          if (defaultSelectedCommits.size > 0 && commit2) {
            const commit2Location = findAppNameAndBranchNameForCommit(
              currentAppNameCommitTreeMap,
              commit2
            );
            if (commit2Location) {
              if (!defaultSelectedCommits.has(commit2Location.appName)) {
                defaultSelectedCommits.set(commit2Location.appName, []);
              }
              defaultSelectedCommits.get(commit2Location.appName)?.push({
                commitId: commit2,
                branchName: commit2Location.branchName,
              });
            }
          }
    
          if (defaultSelectedCommits.size > 0) {
            set({ _selectedCommits: defaultSelectedCommits });
            set({ _currentSelectedApplicationName: commit1Location.appName });
            return true;
          }
        }
        return false;
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
        set({ _appNameAndBranchNameToColorMap: newAppNameAndBranchNameToColorMap });
    },
}));

