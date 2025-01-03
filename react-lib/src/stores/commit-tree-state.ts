import { createStore } from 'zustand/vanilla';
import {
    Commit,
  } from 'react-lib/src/utils/evolution-schemes/evolution-data';

export type SelectedCommit = Commit;

interface CommitTreeStateState {
    _selectedCommits: Map<string, SelectedCommit[]>;
    _appNameAndBranchNameToColorMap: Map<string, string> ;
    _currentSelectedApplicationName: string;
}

export const useCommitTreeStateStore = createStore<CommitTreeStateState>(() => ({
    _selectedCommits: new Map(),
    _appNameAndBranchNameToColorMap: new Map(),
    _currentSelectedApplicationName: '',
}));

