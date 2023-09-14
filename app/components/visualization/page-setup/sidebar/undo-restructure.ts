import { action } from '@ember/object';
import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import LandscapeRestructure from 'explorviz-frontend/services/landscape-restructure';
import Changelog from 'explorviz-frontend/services/changelog';
import {
  AppChangeLogEntry,
  BaseChangeLogEntry,
  ClassChangeLogEntry,
  CommunicationChangeLogEntry,
  PackageChangeLogEntry,
  SubPackageChangeLogEntry,
} from 'explorviz-frontend/utils/changelog-entry';

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
    const bundledCreateEntries = this.isCreateBundle(
      lastElement,
      []
    )?.reverse();

    if (bundledCreateEntries?.length) {
      this.landscapeRestructure.undoBundledEntries(bundledCreateEntries);
    } else {
      this.landscapeRestructure.undoEntry(lastElement);
    }
  }

  isCreateBundle(
    entry: BaseChangeLogEntry,
    bundledEntries: BaseChangeLogEntry[]
  ): BaseChangeLogEntry[] | undefined {
    if (
      entry instanceof AppChangeLogEntry ||
      entry instanceof CommunicationChangeLogEntry
    ) {
      return undefined;
    }

    if (entry instanceof PackageChangeLogEntry) {
      if (entry.createdWithApp) {
        bundledEntries.push(entry, entry.createdWithApp);
        return bundledEntries;
      }
      if (bundledEntries.length) {
        bundledEntries.push(entry);
        return bundledEntries;
      }
    }

    if (entry instanceof SubPackageChangeLogEntry && bundledEntries.length) {
      bundledEntries.push(entry);
      return bundledEntries;
    }

    if (entry instanceof ClassChangeLogEntry && entry.createdWithPackage) {
      bundledEntries.push(entry);
      return this.isCreateBundle(entry.createdWithPackage, bundledEntries);
    }

    return undefined;
  }
}
