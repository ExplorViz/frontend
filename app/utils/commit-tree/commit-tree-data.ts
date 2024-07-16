import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import debugLogger from 'ember-debug-logger';

export default class CommitTreeData {
  private readonly debug = debugLogger('CommitTreeData');

  // #region Properties and getter
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
  // #endregion
}
