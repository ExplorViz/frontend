import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import {
  AppNameCommitTreeMap,
  Commit,
} from 'explorviz-frontend/utils/evolution-schemes/evolution-data';
import { findAppNameAndBranchNameForCommit } from 'explorviz-frontend/utils/evolution-data-helpers';

export type SelectedCommit = Commit;

export default class CommitTreeStateService extends Service {
  // #region Properties and getter
  @tracked
  private _selectedCommits: Map<string, SelectedCommit[]> = new Map(); //<appName, SelectedCommit[]>

  get selectedCommits() {
    return this._selectedCommits;
  }

  private _appNameAndBranchNameToColorMap: Map<string, string> = new Map();

  @tracked
  private _currentSelectedApplicationName: string = '';

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
