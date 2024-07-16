import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import debugLogger from 'ember-debug-logger';
import { Commit } from '../evolution-schemes/evolution-data';
//import { areMapsEqual } from '../helpers/map-helpers';

export type SelectedCommit = Commit;

export default class CommitTreeData {
  private readonly debug = debugLogger('CommitTreeData');

  // #region Properties and getter
  @tracked
  private _selectedCommits: Map<string, SelectedCommit[]> = new Map();

  get selectedCommits() {
    return this._selectedCommits;
  }

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
    //if (!areMapsEqual(this._selectedCommits, newSelectedCommits)) {
    // don't trigger unnecessary rerendering of components
    this._selectedCommits = newSelectedCommits;
    //console.log('newSelectedCommits', newSelectedCommits);
    // }
  }
  // #endregion
}
