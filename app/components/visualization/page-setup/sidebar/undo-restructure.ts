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
import { MeshAction } from 'explorviz-frontend/utils/change-log-entry';
import {
  Application,
  Class,
  Package,
  StructureLandscapeData,
  isApplication,
  isClass,
  isPackage,
} from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import { getApplicationFromClass } from 'explorviz-frontend/utils/landscape-structure-helpers';

export default class UndoRestructure extends Component {
  @service('landscape-restructure')
  landscapeRestructure!: LandscapeRestructure;

  @service('changelog')
  changeLog!: Changelog;

  get canUndo() {
    return this.changeLog.changeLogEntries.length > 0;
  }

  @action
  undoAction() {
    const entries = this.changeLog.changeLogEntries;
    const lastElementIndex = entries.length - 1;
    const lastElement = entries[lastElementIndex];
    const bundledCreateEntries = this.isCreateBundle(
      lastElement,
      []
    )?.reverse();
    if (bundledCreateEntries?.length) {
      const entry = bundledCreateEntries.firstObject;
      if (entry instanceof AppChangeLogEntry) {
        const { app } = entry;

        this.landscapeRestructure.deleteAppFromPopup(
          app as Application,
          false,
          true
        );
      } else if (
        entry instanceof PackageChangeLogEntry ||
        entry instanceof SubPackageChangeLogEntry
      ) {
        const { pckg } = entry;

        this.landscapeRestructure.deletePackageFromPopup(
          pckg as Package,
          false,
          true
        );
      }
      entries.removeObjects(bundledCreateEntries);
    } else {
      if (lastElement.action === MeshAction.Create) {
        if (lastElement instanceof ClassChangeLogEntry) {
          const { clazz } = lastElement;
          this.landscapeRestructure.deleteClassFromPopup(
            clazz as Class,
            false,
            true
          );
        } else if (lastElement instanceof CommunicationChangeLogEntry) {
          this.landscapeRestructure.deleteCommunication(undefined, true);
        }
      }

      if (lastElement.action === MeshAction.Rename) {
        if (lastElement instanceof AppChangeLogEntry) {
          const { app, originalAppName } = lastElement;
          this.landscapeRestructure.updateApplicationName(
            originalAppName as string,
            app?.id as string,
            false,
            true
          );
        } else if (lastElement instanceof PackageChangeLogEntry) {
          const { pckg, originalPckgName } = lastElement;
          this.landscapeRestructure.updatePackageName(
            originalPckgName as string,
            pckg?.id as string,
            false,
            true
          );
        } else if (lastElement instanceof SubPackageChangeLogEntry) {
          const { pckg, originalPckgName } = lastElement;
          this.landscapeRestructure.updateSubPackageName(
            originalPckgName as string,
            pckg?.id as string,
            false,
            true
          );
        } else if (lastElement instanceof ClassChangeLogEntry) {
          const { app, clazz, originalClazzName } = lastElement;
          this.landscapeRestructure.updateClassName(
            originalClazzName as string,
            clazz?.id as string,
            app?.id as string,
            false,
            true
          );
        }
      }

      if (lastElement.action === MeshAction.Delete) {
        if (lastElement instanceof AppChangeLogEntry) {
          const { app } = lastElement;
          this.changeLog.restoreDeletedEntries();
          this.landscapeRestructure.restoreApplication(app as Application);
        } else if (
          lastElement instanceof PackageChangeLogEntry ||
          lastElement instanceof SubPackageChangeLogEntry
        ) {
          const { pckg } = lastElement;
          this.changeLog.restoreDeletedEntries();
          this.landscapeRestructure.restorePackage(pckg as Package);
        } else if (lastElement instanceof ClassChangeLogEntry) {
          const { app, clazz } = lastElement;
          this.changeLog.restoreDeletedEntries();
          this.landscapeRestructure.restoreClass(
            app as Application,
            clazz as Class
          );
        }
        entries.removeObject(lastElement);
      }

      if (lastElement.action === MeshAction.CutInsert) {
        if (lastElement instanceof PackageChangeLogEntry) {
          const { origin, pckg } = lastElement;
          this.landscapeRestructure.deletePackageFromPopup(
            pckg as Package,
            false,
            true
          );
          if (isApplication(origin)) {
            this.landscapeRestructure.restoreApplication(origin, true);
          } else if (isPackage(origin)) {
            this.landscapeRestructure.restorePackage(origin, true);
          }
        } else if (lastElement instanceof SubPackageChangeLogEntry) {
          const { origin, pckg } = lastElement;

          if (pckg?.parent) {
            this.landscapeRestructure.deleteSubPackageFromPopup(
              pckg as Package,
              false,
              true
            );
          } else {
            this.landscapeRestructure.deletePackageFromPopup(
              pckg as Package,
              false,
              true
            );
          }
          if (isApplication(origin)) {
            this.landscapeRestructure.restoreApplication(origin, true);
          } else if (isPackage(origin)) {
            this.landscapeRestructure.restorePackage(origin, true);
          }
        } else if (lastElement instanceof ClassChangeLogEntry) {
          const { origin, clazz } = lastElement;

          // TODO Not working correctly if we created communications. Need to update the aftected, created communication (set the source/target class back)
          this.landscapeRestructure.deleteClassFromPopup(
            clazz as Class,
            false,
            true
          );
          if (isApplication(origin)) {
            this.landscapeRestructure.restoreApplication(origin, true);
          } else if (isPackage(origin)) {
            this.landscapeRestructure.restorePackage(origin, true);
          } else if (isClass(origin)) {
            const originApp = getApplicationFromClass(
              this.landscapeRestructure.landscapeData
                ?.structureLandscapeData as StructureLandscapeData,
              origin
            );
            this.landscapeRestructure.restoreClass(
              originApp as Application,
              origin as Class,
              true
            );
          }
        }
      }

      entries.removeObject(lastElement);
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
