import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import {
  AppNameCommitTreeMap,
  Commit,
} from 'react-lib/src/utils/evolution-schemes/evolution-data';
import { findAppNameAndBranchNameForCommit } from 'react-lib/src/utils/evolution-data-helpers';

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

  setDefaultState(
    currentAppNameCommitTreeMap: AppNameCommitTreeMap,
    commit1: string,
    commit2: string | null | undefined
  ): boolean {
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
        this._selectedCommits = defaultSelectedCommits;
        this._currentSelectedApplicationName = commit1Location.appName;
        return true;
      }
    }
    return false;
  }

  // #endregion

  // #region Template actions
  @action
  setCurrentSelectedApplicationName(appName: string) {
    if (this._currentSelectedApplicationName !== appName) {
      // don't trigger unnecessary rerendering of components
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
