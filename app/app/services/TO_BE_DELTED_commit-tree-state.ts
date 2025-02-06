import Service from '@ember/service';
import { action } from '@ember/object';
import {
  AppNameCommitTreeMap,
  Commit,
} from 'react-lib/src/utils/evolution-schemes/evolution-data';
import { findAppNameAndBranchNameForCommit } from 'react-lib/src/utils/evolution-data-helpers';
import { useCommitTreeStateStore } from 'react-lib/src/stores/commit-tree-state';

export type SelectedCommit = Commit;

export default class CommitTreeStateService extends Service {
  // #region Properties and getter
  // @tracked
  // private _selectedCommits: Map<string, SelectedCommit[]> = new Map(); //<appName, SelectedCommit[]>
  get _selectedCommits(): Map<string, SelectedCommit[]> {
    return useCommitTreeStateStore.getState()._selectedCommits;
  }

  set _selectedCommits(value: Map<string, SelectedCommit[]>) {
    useCommitTreeStateStore.setState({ _selectedCommits: value });
  }

  get selectedCommits() {
    return this._selectedCommits;
  }

  // private _appNameAndBranchNameToColorMap: Map<string, string> = new Map();
  get _appNameAndBranchNameToColorMap(): Map<string, string> {
    return useCommitTreeStateStore.getState()._appNameAndBranchNameToColorMap;
  }

  set _appNameAndBranchNameToColorMap(value: Map<string, string>) {
    useCommitTreeStateStore.setState({
      _appNameAndBranchNameToColorMap: value,
    });
  }

  // @tracked
  // private _currentSelectedApplicationName: string = '';
  get _currentSelectedApplicationName(): string {
    return useCommitTreeStateStore.getState()._currentSelectedApplicationName;
  }

  set _currentSelectedApplicationName(value: string) {
    useCommitTreeStateStore.setState({
      _currentSelectedApplicationName: value,
    });
  }

  get currentSelectedApplicationName() {
    return this._currentSelectedApplicationName;
  }
  // #endregion

  // #region Default state function

  // Called when at least one non-empty commit is selected
  // Sets selected Commits and current application name
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
  }

  // #endregion

  // #region Template actions
  @action
  setCurrentSelectedApplicationName(appName: string) {
    // Don't trigger unnecessary rerendering of components by setting tracked property
    if (this._currentSelectedApplicationName !== appName) {
      this._currentSelectedApplicationName = appName;
    }
  }

  @action
  setSelectedCommits(newSelectedCommits: Map<string, SelectedCommit[]>) {
    this._selectedCommits = newSelectedCommits;
  }

  @action
  resetSelectedCommits() {
    this._selectedCommits = new Map();
  }

  @action
  getCloneOfAppNameAndBranchNameToColorMap() {
    return structuredClone(this._appNameAndBranchNameToColorMap);
  }

  @action
  setAppNameAndBranchNameToColorMap(
    newAppNameAndBranchNameToColorMap: Map<string, string>
  ) {
    this._appNameAndBranchNameToColorMap = newAppNameAndBranchNameToColorMap;
  }
  // #endregion
}

declare module '@ember/service' {
  interface Registry {
    'commit-tree-state': CommitTreeStateService;
  }
}
