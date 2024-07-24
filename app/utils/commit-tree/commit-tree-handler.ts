import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import debugLogger from 'ember-debug-logger';
import { Commit } from '../evolution-schemes/evolution-data';

export type SelectedCommit = Commit;

export default class CommitTreeHandler {
  private readonly debug = debugLogger('CommitTreeHandler');

  // #region Properties and getter
  @tracked
  private _selectedCommits: Map<string, SelectedCommit[]> = new Map();

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
