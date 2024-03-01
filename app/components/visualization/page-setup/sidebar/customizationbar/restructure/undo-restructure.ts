import { action } from '@ember/object';
import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import LandscapeRestructure from 'explorviz-frontend/services/landscape-restructure';
import Changelog from 'explorviz-frontend/services/changelog';

export default class UndoRestructure extends Component {
  @service('landscape-restructure')
  landscapeRestructure!: LandscapeRestructure;

  @service('changelog')
  changeLog!: Changelog;

  get canUndo() {
    return this.landscapeRestructure.restructureMode;
  }

  get undoDisabled() {
    return this.changeLog.changeLogEntries.length > 0;
  }

  @action
  undoAction() {
    const entries = this.changeLog.changeLogEntries;
    if (!entries.length) return;
    const lastElementIndex = entries.length - 1;
    const lastElement = entries[lastElementIndex];
    const bundledCreateEntries = this.changeLog
      .isCreateBundle(lastElement, [])
      ?.reverse();

    if (bundledCreateEntries?.length) {
      this.landscapeRestructure.undoBundledEntries(bundledCreateEntries);
    } else {
      this.landscapeRestructure.undoEntry(lastElement);
    }
  }
}
