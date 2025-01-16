import Service, { inject as service } from '@ember/service';
import Evented from '@ember/object/evented';
import {
  Application,
  Class,
  Package,
  StructureLandscapeData,
} from 'react-lib/src/utils/landscape-schemes/structure-data';
import {
  RestructureAction,
  EntityType,
} from 'react-lib/src/utils/restructure-helper';
import { getAncestorPackages } from 'react-lib/src/utils/package-helpers';
import {
  AppChangeLogEntry,
  BaseChangeLogEntry,
  ClassChangeLogEntry,
  CommunicationChangeLogEntry,
  PackageChangeLogEntry,
  SubPackageChangeLogEntry,
} from 'react-lib/src/utils/changelog-entry';
// import { tracked } from '@glimmer/tracking';
import ClassCommunication from 'react-lib/src/utils/landscape-schemes/dynamic/class-communication';
import MessageSender from 'explorviz-frontend/services/collaboration/message-sender';
import { useChangelogStore } from 'react-lib/src/stores/changelog';

export default class Changelog extends Service.extend(Evented, {
  // anything which *must* be merged to prototype here
}) {
  @service('collaboration/message-sender')
  private sender!: MessageSender;

  // @tracked
  // changeLogEntries: BaseChangeLogEntry[] = [];
  get changeLogEntries(): BaseChangeLogEntry[] {
    return useChangelogStore.getState().changeLogEntries;
  }

  set changeLogEntries(value: BaseChangeLogEntry[]) {
    useChangelogStore.setState({ changeLogEntries: value });
  }

  // Necessary for the created Packages and Classes that are not in the baseChangeLogEntries!!
  deletedChangeLogEntries: Map<string, BaseChangeLogEntry[]> = new Map();

  // get _changeLogEntries() {
  //   return this.changeLogEntries;
  // }
  get _changeLogEntries() {
    return useChangelogStore.getState().changeLogEntries;
  }

  resetChangeLog() {
    useChangelogStore.getState().resetChangeLog();
  }

  createAppEntry(app: Application, pckg: Package, clazz: Class) {
    useChangelogStore.getState().createAppEntry(app, pckg, clazz);
    //this.trigger('showChangeLog');
  }

  createPackageEntry(
    app: Application,
    pckg: Package,
    clazz: Class,
    appEntry?: AppChangeLogEntry
  ) {
    useChangelogStore.getState().createPackageEntry(app, pckg, clazz, appEntry);
    //this.trigger('showChangeLog');
  }

  createClassEntry(
    app: Application,
    clazz: Class,
    pckgEntry?: PackageChangeLogEntry | SubPackageChangeLogEntry
  ) {
    useChangelogStore.getState().createClassEntry(app, clazz, pckgEntry);
    //this.trigger('showChangeLog');
  }

  renameAppEntry(app: Application, newName: string) {
    useChangelogStore.getState().renameAppEntry(app, newName);
    //this.changeLogEntries = [...this.changeLogEntries];
    //this.trigger('showChangeLog');
  }

  renamePackageEntry(app: Application, pckg: Package, newName: string) {
    useChangelogStore.getState().renamePackageEntry(app, pckg, newName);
    //this.changeLogEntries = [...this.changeLogEntries];
    //this.trigger('showChangeLog');
  }

  renameSubPackageEntry(app: Application, pckg: Package, newName: string) {
    useChangelogStore.getState().renameSubPackageEntry(app, pckg, newName);
    //this.changeLogEntries = [...this.changeLogEntries];
    //this.trigger('showChangeLog');
  }

  renameClassEntry(app: Application, clazz: Class, newName: string) {
    useChangelogStore.getState().renameClassEntry(app, clazz, newName);
    //this.changeLogEntries = [...this.changeLogEntries];
    //this.trigger('showChangeLog');
  }

  deleteAppEntry(app: Application, undoInsert: boolean = false) {
    useChangelogStore.getState().deleteAppEntry(app, undoInsert);
    // if (foundEntry) {
    //   if (foundEntry.action === RestructureAction.Create) {
    //     //this.trigger('showChangeLog');
    //     return;
    //   }
    //   originalAppName = foundEntry.originalAppName as string;
    // }

    // if (undoInsert) {
    //   return;
    // }

    // const appLogEntry = new AppChangeLogEntry(RestructureAction.Delete, app);
    // this.addToDeletedEntriesMap(app.id, appLogEntry);

    // if (originalAppName !== '') appLogEntry.originalAppName = originalAppName;
    // this.changeLogEntries.pushObject(appLogEntry);
    // //this.trigger('showChangeLog');
  }

  addToDeletedEntriesMap(key: string, entry: BaseChangeLogEntry) {
    useChangelogStore.getState().addToDeletedEntriesMap(key, entry);
  }

  deletePackageEntry(
    app: Application,
    pckg: Package,
    undoInsert: boolean = false
  ) {
    useChangelogStore.getState().deletePackageEntry(app, pckg, undoInsert);
    //     //this.trigger('showChangeLog');
    //     return;
    //   } else if (foundEntry.action === RestructureAction.Rename) {
    //     originalPckgName = foundEntry.originalPckgName as string;
    //   }
    // }

    // if (undoInsert) {
    //   return;
    // }

    // const pckgLogEntry = new PackageChangeLogEntry(
    //   RestructureAction.Delete,
    //   app,
    //   pckg
    // );

    // this.addToDeletedEntriesMap(pckg.id, pckgLogEntry);

    // if (originalPckgName !== '') {
    //   pckgLogEntry.originalPckgName = originalPckgName;
    // }

    // this.changeLogEntries.pushObject(pckgLogEntry);
    // //this.trigger('showChangeLog');
  }

  private storeDeletedEntries(key: string) {
    useChangelogStore.getState().storeDeletedEntries(key);
  }

  deleteSubPackageEntry(
    app: Application,
    pckg: Package,
    undoInsert: boolean = false
  ) {
    useChangelogStore.getState().deleteSubPackageEntry(app, pckg, undoInsert);
    //   if (foundEntry.action === RestructureAction.Create) {
    //     //this.trigger('showChangeLog');
    //     return;
    //   } else if (foundEntry.action === RestructureAction.Rename) {
    //     originalPckgName = foundEntry.originalPckgName as string;
    //   }
    // }

    // if (undoInsert) {
    //   return;
    // }

    // const pckgLogEntry = new SubPackageChangeLogEntry(
    //   RestructureAction.Delete,
    //   app,
    //   pckg
    // );

    // this.addToDeletedEntriesMap(pckg.id, pckgLogEntry);
    // if (originalPckgName !== '') {
    //   pckgLogEntry.originalPckgName = originalPckgName;
    // }
    // this.changeLogEntries.pushObject(pckgLogEntry);
    // //this.trigger('showChangeLog');
  }

  deleteClassEntry(
    app: Application,
    clazz: Class,
    undoInsert: boolean = false
  ) {
    useChangelogStore.getState().deleteClassEntry(app, clazz, undoInsert);
    //   if (foundEntry.action === RestructureAction.Create) {
    //     //this.trigger('showChangeLog');
    //     return;
    //   } else if (foundEntry.action === RestructureAction.Rename) {
    //     originalClazzName = foundEntry.originalClazzName as string;
    //   }
    // }

    // if (undoInsert) {
    //   return;
    // }

    // const clazzLogEntry = new ClassChangeLogEntry(
    //   RestructureAction.Delete,
    //   app,
    //   clazz
    // );

    // this.addToDeletedEntriesMap(clazz.id, clazzLogEntry);
    // if (originalClazzName !== '') {
    //   clazzLogEntry.originalClazzName = originalClazzName;
    // }
    // this.changeLogEntries.pushObject(clazzLogEntry);
    // //this.trigger('showChangeLog');
  }

  duplicateAppEntry(app: Application) {
    useChangelogStore.getState().duplicateAppEntry(app);
  }

  copyPackageEntry(
    app: Application,
    pckg: Package,
    destination: Application | Package,
    original: Package,
    landscapeData: StructureLandscapeData
  ) {
    useChangelogStore
      .getState()
      .copyPackageEntry(app, pckg, destination, original, landscapeData);
  }

  copySubPackageEntry(
    app: Application,
    pckg: Package,
    destination: Application | Package,
    original: Package,
    landscapeData: StructureLandscapeData
  ) {
    useChangelogStore
      .getState()
      .copySubPackageEntry(app, pckg, destination, original, landscapeData);
  }

  copyClassEntry(
    app: Application,
    clazz: Class,
    destination: Package,
    original: Class,
    landscapeData: StructureLandscapeData
  ) {
    useChangelogStore
      .getState()
      .copyClassEntry(app, clazz, destination, original, landscapeData);
  }

  movePackageEntry(
    app: Application,
    pckg: Package,
    destination: Application | Package,
    original: Package,
    landscapeData: StructureLandscapeData
  ) {
    useChangelogStore
      .getState()
      .movePackageEntry(app, pckg, destination, original, landscapeData);
    //this.trigger('showChangeLog');
  }

  moveSubPackageEntry(
    app: Application,
    pckg: Package,
    destination: Application | Package,
    original: Package,
    landscapeData: StructureLandscapeData
  ) {
    useChangelogStore
      .getState()
      .moveSubPackageEntry(app, pckg, destination, original, landscapeData);
    //this.trigger('showChangeLog');
  }

  moveClassEntry(
    app: Application,
    clazz: Class,
    destination: Package,
    origin: Class,
    landscapeData: StructureLandscapeData
  ) {
    useChangelogStore
      .getState()
      .moveClassEntry(app, clazz, destination, origin, landscapeData);
    //this.trigger('showChangeLog');
  }

  communicationEntry(communication: ClassCommunication) {
    useChangelogStore.getState().communicationEntry(communication);
    //this.trigger('showChangeLog');
  }

  renameOperationEntry(communication: ClassCommunication, newName: string) {
    useChangelogStore.getState().renameOperationEntry(communication, newName);
    // if (
    //   foundEntry &&
    //   foundEntry instanceof CommunicationChangeLogEntry &&
    //   foundEntry.communication
    // ) {
    //   if (foundEntry.action === RestructureAction.Create) {
    //     foundEntry.communication.operationName = newName;
    //   } else if (foundEntry.action === RestructureAction.Rename) {
    //     foundEntry.newName = newName;
    //   }
    //   //this.trigger('showChangeLog');
    //   return;
    // }

    // const commEntry = new CommunicationChangeLogEntry(
    //   RestructureAction.Rename,
    //   communication
    // );
    // commEntry.newName = newName;

    // this.changeLogEntries.pushObject(commEntry);

    // this.changeLogEntries = [...this.changeLogEntries];
    // //this.trigger('showChangeLog');
  }

  deleteCommunicationEntry(communication: ClassCommunication) {
    useChangelogStore.getState().deleteCommunicationEntry(communication);
    // const foundEntry = this.findCommunicationLogEntry(
    //   communication.id,
    //   true
    // ) as CommunicationChangeLogEntry;
    // this.storeDeletedEntries(communication.id);
    // let originalName = communication.operationName;
    // if (foundEntry) {
    //   this.changeLogEntries.removeObject(foundEntry);
    //   if (foundEntry.action === RestructureAction.Create) {
    //     //this.trigger('showChangeLog');
    //     return;
    //   }
    //   originalName = foundEntry.originalOperationName as string;
    // }

    // const commEntry = new CommunicationChangeLogEntry(
    //   RestructureAction.Delete,
    //   communication
    // );

    // commEntry.originalOperationName = originalName;

    // this.changeLogEntries.pushObject(commEntry);

    // //this.trigger('showChangeLog');
  }

  /**
   * Retrieves the log text for all changelog entries.
   * @returns string with all log texts with each seperated by a new line
   */
  getChangeLog() {
    return useChangelogStore.getState().getChangeLog();
  }

  /**
   * Restores entries that were previously removed due to a delete operation.
   * It fetches the last set of deleted entries and puts them into the main log.
   */
  restoreDeletedEntries(key: string, collabMode: boolean = false) {
    if (!collabMode) {
      this.sender.sendChangeLogRestoreEntriesMessage(key);
    }
    const deletedEntries = this.deletedChangeLogEntries.get(key);
    if (!deletedEntries?.length) return;

    const lastEntry = deletedEntries.popObject();

    const index = this.changeLogEntries.findIndex(
      (entry) => entry.id === lastEntry?.id
    );

    this.changeLogEntries.splice(0, index + 1, ...deletedEntries);
    this.changeLogEntries = [...this.changeLogEntries];

    for (const deletedList of this.deletedChangeLogEntries.values()) {
      const index = deletedList.findIndex((deleted) => {
        return deleted.id === lastEntry.id;
      });

      if (index === -1) continue;

      deletedList.splice(0, index + 1, ...deletedEntries);
    }

    this.deletedChangeLogEntries.delete(key);

    //this.trigger('showChangeLog');
  }

  private findBaseChangeLogEntry(
    entityType: EntityType,
    entity: Application | Package | Class
  ) {
    return useChangelogStore
      .getState()
      .findBaseChangeLogEntry(entityType, entity);
  }

  private findCommunicationLogEntry(
    clazzOrId: Class | string,
    searchById: boolean = false
  ): BaseChangeLogEntry | undefined {
    return useChangelogStore
      .getState()
      .findCommunicationLogEntry(clazzOrId, searchById);
  }

  isCreateBundle(
    entry: BaseChangeLogEntry,
    bundledEntries: BaseChangeLogEntry[]
  ): BaseChangeLogEntry[] | undefined {
    return useChangelogStore.getState().isCreateBundle(entry, bundledEntries);
  }

  /**
   * Removes changelog entries for packages and classes located under a specified package within a given application.
   * @param app The application containing the package of interest. Changelog entries within this application will be evaluated.
   * @param pckg The package of interest. Changelog entries under this package will be removed.
   */
  private removeLogEntriesUnderPackage(app: Application, pckg: Package) {
    useChangelogStore.getState().removeLogEntriesUnderPackage(app, pckg);
  }

  removeEntry(entry: BaseChangeLogEntry, collabMode: boolean = false) {
    if (!collabMode) {
      this.sender.sendChangeLogRemoveEntryMessage([entry.id]);
    }

    this.changeLogEntries.removeObject(entry);

    for (const deletedList of this.deletedChangeLogEntries.values()) {
      deletedList.removeObject(entry);
    }
    //this.trigger('showChangeLog');
  }

  removeEntries(entries: BaseChangeLogEntry[], collabMode: boolean = false) {
    if (!collabMode) {
      const ids: string[] = [];
      this.changeLogEntries.forEach((entry) => {
        ids.pushObject(entry.id);
      });
      this.sender.sendChangeLogRemoveEntryMessage(ids);
    }

    this.changeLogEntries.removeObjects(entries);

    for (const deletedList of this.deletedChangeLogEntries.values()) {
      deletedList.removeObjects(entries);
    }
    //this.trigger('showChangeLog');
  }

  private removeExternCommunicationsInsidePackage(
    logEntry: CommunicationChangeLogEntry,
    commPckg: Package,
    pckg: Package,
    entriesToRemove: BaseChangeLogEntry[]
  ) {
    useChangelogStore
      .getState()
      .removeExternCommunicationsInsidePackage(
        logEntry,
        commPckg,
        pckg,
        entriesToRemove
      );
  }

  private removeInternCommunicationsInsidePackage(
    logEntry: CommunicationChangeLogEntry,
    sourcePckg: Package,
    targetPckg: Package,
    pckg: Package,
    entriesToRemove: BaseChangeLogEntry[]
  ) {
    useChangelogStore
      .getState()
      .removeInternCommunicationsInsidePackage(
        logEntry,
        sourcePckg,
        targetPckg,
        pckg,
        entriesToRemove
      );
  }

  private updateCreateLogEntries(
    app: Application,
    pckg: Package,
    destination: Application | Package,
    landscapeData: StructureLandscapeData
  ) {
    useChangelogStore
      .getState()
      .updateCreateLogEntries(app, pckg, destination, landscapeData);
  }

  private updateCutInserLogEntries(
    app: Application,
    pckg: Package,
    destination: Application | Package,
    landscapeData: StructureLandscapeData
  ) {
    useChangelogStore
      .getState()
      .updateCutInserLogEntries(app, pckg, destination, landscapeData);
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    changelog: Changelog;
  }
}
