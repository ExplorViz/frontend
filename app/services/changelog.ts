import Service, { inject as service } from '@ember/service';
import Evented from '@ember/object/evented';
import {
  Application,
  Class,
  Package,
  StructureLandscapeData,
} from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import {
  MeshAction,
  EntityType,
} from 'explorviz-frontend/utils/restructure-helper';
import { getAncestorPackages } from 'explorviz-frontend/utils/package-helpers';
import {
  AppChangeLogEntry,
  BaseChangeLogEntry,
  ClassChangeLogEntry,
  CommunicationChangeLogEntry,
  PackageChangeLogEntry,
  SubPackageChangeLogEntry,
} from 'explorviz-frontend/utils/changelog-entry';
import { DrawableClassCommunication } from 'explorviz-frontend/utils/application-rendering/class-communication-computer';
import { tracked } from '@glimmer/tracking';
import VrMessageSender from 'virtual-reality/services/vr-message-sender';

export default class Changelog extends Service.extend(Evented, {
  // anything which *must* be merged to prototype here
}) {
  @service('vr-message-sender')
  private sender!: VrMessageSender;

  @tracked
  changeLogEntries: BaseChangeLogEntry[] = [];

  // Necessary for the created Packages and Classes that are not in the baseChangeLogEntries!!
  deletedChangeLogEntries: Map<string, BaseChangeLogEntry[]> = new Map();

  get _changeLogEntries() {
    return this.changeLogEntries;
  }

  createAppEntry(app: Application, pckg: Package, clazz: Class) {
    const appLogEntry = new AppChangeLogEntry(MeshAction.Create, app);

    this.changeLogEntries.pushObject(appLogEntry);
    this.createPackageEntry(app, pckg, clazz, appLogEntry);

    //this.trigger('showChangeLog');
  }

  createPackageEntry(
    app: Application,
    pckg: Package,
    clazz: Class,
    appEntry?: AppChangeLogEntry
  ) {
    if (pckg.parent) {
      const pckgLogEntry = new SubPackageChangeLogEntry(
        MeshAction.Create,
        app,
        pckg
      );

      this.changeLogEntries.pushObject(pckgLogEntry);
      this.createClassEntry(app, clazz, pckgLogEntry);
    } else {
      const pckgLogEntry = new PackageChangeLogEntry(
        MeshAction.Create,
        app,
        pckg
      );

      if (appEntry) pckgLogEntry._createdWithApp = appEntry;

      this.changeLogEntries.pushObject(pckgLogEntry);
      this.createClassEntry(app, clazz, pckgLogEntry);
    }
    //this.trigger('showChangeLog');
  }

  createClassEntry(
    app: Application,
    clazz: Class,
    pckgEntry?: PackageChangeLogEntry | SubPackageChangeLogEntry
  ) {
    const clazzLogEntry = new ClassChangeLogEntry(
      MeshAction.Create,
      app,
      clazz
    );
    if (pckgEntry) clazzLogEntry.createdWithPackage = pckgEntry;
    this.changeLogEntries.pushObject(clazzLogEntry);
    //this.trigger('showChangeLog');
  }

  renameAppEntry(app: Application, newName: string) {
    const foundEntry = this.findBaseChangeLogEntry(EntityType.App, app);

    if (!foundEntry) {
      const appLogEntry = new AppChangeLogEntry(MeshAction.Rename, app);
      appLogEntry.newName = newName;
      this.changeLogEntries.pushObject(appLogEntry);
    } else {
      if (foundEntry.app && foundEntry.action === MeshAction.Create) {
        foundEntry.app.name = newName;
      } else {
        foundEntry.newName = newName;
      }
    }
    //this.changeLogEntries = [...this.changeLogEntries];
    //this.trigger('showChangeLog');
  }

  renamePackageEntry(app: Application, pckg: Package, newName: string) {
    const foundEntry = this.findBaseChangeLogEntry(
      EntityType.Package,
      pckg
    ) as PackageChangeLogEntry;

    if (!foundEntry) {
      const pckgLogEntry = new PackageChangeLogEntry(
        MeshAction.Rename,
        app,
        pckg
      );
      pckgLogEntry.newName = newName;
      this.changeLogEntries.pushObject(pckgLogEntry);
    } else {
      if (
        foundEntry.action === MeshAction.Create ||
        foundEntry.action === MeshAction.CutInsert
      ) {
        foundEntry.pckg.name = newName;
      } else {
        foundEntry.newName = newName;
      }
    }
    //this.changeLogEntries = [...this.changeLogEntries];
    //this.trigger('showChangeLog');
  }

  renameSubPackageEntry(app: Application, pckg: Package, newName: string) {
    const foundEntry = this.findBaseChangeLogEntry(
      EntityType.SubPackage,
      pckg
    ) as SubPackageChangeLogEntry;

    if (!foundEntry) {
      const pckgLogEntry = new SubPackageChangeLogEntry(
        MeshAction.Rename,
        app,
        pckg
      );
      pckgLogEntry.newName = newName;
      this.changeLogEntries.pushObject(pckgLogEntry);
    } else {
      if (
        foundEntry.action === MeshAction.Create ||
        foundEntry.action === MeshAction.CutInsert
      ) {
        foundEntry.pckg.name = newName;
      } else {
        foundEntry.newName = newName;
      }
    }
    //this.changeLogEntries = [...this.changeLogEntries];
    //this.trigger('showChangeLog');
  }

  renameClassEntry(app: Application, clazz: Class, newName: string) {
    const foundEntry = this.findBaseChangeLogEntry(
      EntityType.Clazz,
      clazz
    ) as ClassChangeLogEntry;

    if (!foundEntry || foundEntry.action === MeshAction.CutInsert) {
      const clazzLogEntry = new ClassChangeLogEntry(
        MeshAction.Rename,
        app,
        clazz
      );
      clazzLogEntry.newName = newName;
      this.changeLogEntries.pushObject(clazzLogEntry);
    } else {
      if (foundEntry.action === MeshAction.Create) {
        foundEntry.clazz.name = newName;
      } else {
        foundEntry.newName = newName;
      }
    }
    //this.changeLogEntries = [...this.changeLogEntries];
    //this.trigger('showChangeLog');
  }

  deleteAppEntry(app: Application, undoInsert: boolean = false) {
    const foundEntry = this.findBaseChangeLogEntry(
      EntityType.App,
      app
    ) as AppChangeLogEntry;
    let originalAppName = '';

    this.storeDeletedEntries(app.id);

    this.changeLogEntries = this.changeLogEntries.filter((entry) => {
      if (!(entry instanceof CommunicationChangeLogEntry)) {
        return entry.app?.id !== app.id;
      } else {
        return (
          entry.communication?.sourceApp?.id !== app.id &&
          entry.communication?.targetApp?.id !== app.id
        );
      }
    });
    if (foundEntry) {
      if (foundEntry.action === MeshAction.Create) {
        //this.trigger('showChangeLog');
        return;
      }
      originalAppName = foundEntry.originalAppName as string;
    }

    if (undoInsert) {
      return;
    }

    const appLogEntry = new AppChangeLogEntry(MeshAction.Delete, app);
    this.addToDeletedEntriesMap(app.id, appLogEntry);

    if (originalAppName !== '') appLogEntry.originalAppName = originalAppName;
    this.changeLogEntries.pushObject(appLogEntry);
    //this.trigger('showChangeLog');
  }

  addToDeletedEntriesMap(key: string, entry: BaseChangeLogEntry) {
    const deletedEntries = this.deletedChangeLogEntries.get(key);
    deletedEntries?.pushObject(entry);
  }

  deletePackageEntry(
    app: Application,
    pckg: Package,
    undoInsert: boolean = false
  ) {
    const foundEntry = this.findBaseChangeLogEntry(
      EntityType.Package,
      pckg
    ) as PackageChangeLogEntry;

    if (!undoInsert) this.storeDeletedEntries(pckg.id);

    // We don't want to undo the undo, thats why we dont store the data then
    this.removeLogEntriesUnderPackage(app, pckg);

    let originalPckgName = '';

    if (foundEntry) {
      this.changeLogEntries = this.changeLogEntries.filter(
        (entry: PackageChangeLogEntry) => entry.pckg?.id !== pckg.id
      );
      if (foundEntry.action === MeshAction.Create) {
        //this.trigger('showChangeLog');
        return;
      } else if (foundEntry.action === MeshAction.Rename) {
        originalPckgName = foundEntry.originalPckgName as string;
      }
    }

    if (undoInsert) {
      return;
    }

    const pckgLogEntry = new PackageChangeLogEntry(
      MeshAction.Delete,
      app,
      pckg
    );

    this.addToDeletedEntriesMap(pckg.id, pckgLogEntry);

    if (originalPckgName !== '') {
      pckgLogEntry.originalPckgName = originalPckgName;
    }

    this.changeLogEntries.pushObject(pckgLogEntry);
    //this.trigger('showChangeLog');
  }

  private storeDeletedEntries(key: string) {
    if (!this.changeLogEntries.length) return;
    const deletedEntries: BaseChangeLogEntry[] = [];
    this.changeLogEntries.forEach((entry) => {
      deletedEntries.pushObject(entry);
    });
    this.deletedChangeLogEntries.set(key, deletedEntries);
  }

  deleteSubPackageEntry(
    app: Application,
    pckg: Package,
    undoInsert: boolean = false
  ) {
    const foundEntry = this.findBaseChangeLogEntry(
      EntityType.SubPackage,
      pckg
    ) as SubPackageChangeLogEntry;

    // We don't want to undo the undo, thats why we dont store the data then
    if (!undoInsert) this.storeDeletedEntries(pckg.id);

    this.removeLogEntriesUnderPackage(app, pckg);

    let originalPckgName = '';

    if (foundEntry) {
      this.changeLogEntries = this.changeLogEntries.filter(
        (entry: SubPackageChangeLogEntry) => entry.pckg?.id !== pckg.id
      );
      if (foundEntry.action === MeshAction.Create) {
        //this.trigger('showChangeLog');
        return;
      } else if (foundEntry.action === MeshAction.Rename) {
        originalPckgName = foundEntry.originalPckgName as string;
      }
    }

    if (undoInsert) {
      return;
    }

    const pckgLogEntry = new SubPackageChangeLogEntry(
      MeshAction.Delete,
      app,
      pckg
    );

    this.addToDeletedEntriesMap(pckg.id, pckgLogEntry);
    if (originalPckgName !== '') {
      pckgLogEntry.originalPckgName = originalPckgName;
    }
    this.changeLogEntries.pushObject(pckgLogEntry);
    //this.trigger('showChangeLog');
  }

  deleteClassEntry(
    app: Application,
    clazz: Class,
    undoInsert: boolean = false
  ) {
    const foundEntry = this.findBaseChangeLogEntry(
      EntityType.Clazz,
      clazz
    ) as ClassChangeLogEntry;
    const commEntry = this.findCommunicationLogEntry(clazz);

    // We don't want to undo the undo, thats why we dont store the data then
    if (!undoInsert) {
      this.storeDeletedEntries(clazz.id);
    }

    // Remove Communication Log Entry
    if (commEntry) this.changeLogEntries.removeObject(commEntry);

    let originalClazzName = '';
    if (foundEntry) {
      this.changeLogEntries = this.changeLogEntries.filter(
        (entry: ClassChangeLogEntry) => entry.clazz?.id !== clazz.id
      );
      if (foundEntry.action === MeshAction.Create) {
        //this.trigger('showChangeLog');
        return;
      } else if (foundEntry.action === MeshAction.Rename) {
        originalClazzName = foundEntry.originalClazzName as string;
      }
    }

    if (undoInsert) {
      return;
    }

    const clazzLogEntry = new ClassChangeLogEntry(
      MeshAction.Delete,
      app,
      clazz
    );

    this.addToDeletedEntriesMap(clazz.id, clazzLogEntry);
    if (originalClazzName !== '') {
      clazzLogEntry.originalClazzName = originalClazzName;
    }
    this.changeLogEntries.pushObject(clazzLogEntry);
    //this.trigger('showChangeLog');
  }

  cutAndInsertPackageEntry(
    app: Application,
    pckg: Package,
    destination: Application | Package,
    origin: Application | Package | Class,
    landscapeData: StructureLandscapeData
  ) {
    const foundEntry =
      this.findBaseChangeLogEntry(EntityType.Package, pckg) ||
      this.findBaseChangeLogEntry(EntityType.SubPackage, pckg);
    if (foundEntry) {
      if (foundEntry.action == MeshAction.Create) {
        this.updateCreateLogEntries(app, pckg, destination, landscapeData);
      } else {
        this.updateCutInserLogEntries(app, pckg, destination, landscapeData);
      }
    } else {
      const pckgLogEntry = new PackageChangeLogEntry(
        MeshAction.CutInsert,
        app,
        pckg
      );
      pckgLogEntry.setDestination(destination, landscapeData);
      pckgLogEntry.setOrigin(origin);
      this.changeLogEntries.pushObject(pckgLogEntry);
    }

    //this.trigger('showChangeLog');
  }

  cutAndInsertSubPackageEntry(
    app: Application,
    pckg: Package,
    destination: Application | Package,
    origin: Application | Package | Class,
    landscapeData: StructureLandscapeData
  ) {
    const foundEntry =
      this.findBaseChangeLogEntry(EntityType.SubPackage, pckg) ||
      this.findBaseChangeLogEntry(EntityType.Package, pckg);

    if (foundEntry) {
      if (foundEntry.action == MeshAction.Create) {
        this.updateCreateLogEntries(app, pckg, destination, landscapeData);
      } else {
        this.updateCutInserLogEntries(app, pckg, destination, landscapeData);
      }
    } else {
      const pckgLogEntry = new SubPackageChangeLogEntry(
        MeshAction.CutInsert,
        app,
        pckg
      );
      pckgLogEntry.setDestination(destination, landscapeData);
      pckgLogEntry.setOrigin(origin);
      this.changeLogEntries.pushObject(pckgLogEntry);
    }
    //this.trigger('showChangeLog');
  }

  cutAndInsertClassEntry(
    app: Application,
    clazz: Class,
    destination: Package,
    origin: Application | Package | Class,
    landscapeData: StructureLandscapeData
  ) {
    const foundEntry = this.findBaseChangeLogEntry(
      EntityType.Clazz,
      clazz
    ) as ClassChangeLogEntry;

    if (foundEntry) {
      if (foundEntry.action === MeshAction.Create) {
        foundEntry.updateOrigin(destination, landscapeData);
      } else {
        foundEntry.setDestination(destination, landscapeData);
      }
    } else {
      const clazzLogEntry = new ClassChangeLogEntry(
        MeshAction.CutInsert,
        app,
        clazz
      );
      clazzLogEntry.setDestination(destination, landscapeData);
      clazzLogEntry.setOrigin(origin);
      this.changeLogEntries.pushObject(clazzLogEntry);
    }
    //this.trigger('showChangeLog');
  }

  communicationEntry(communication: DrawableClassCommunication) {
    const commEntry = new CommunicationChangeLogEntry(
      MeshAction.Create,
      communication
    );
    this.changeLogEntries.pushObject(commEntry);

    //this.trigger('showChangeLog');
  }

  renameOperationEntry(
    communication: DrawableClassCommunication,
    newName: string
  ) {
    const foundEntry = this.findCommunicationLogEntry(communication.id, true);

    if (
      foundEntry &&
      foundEntry instanceof CommunicationChangeLogEntry &&
      foundEntry.communication
    ) {
      if (foundEntry.action === MeshAction.Create) {
        foundEntry.communication.operationName = newName;
      } else if (foundEntry.action === MeshAction.Rename) {
        foundEntry.newName = newName;
      }
      //this.trigger('showChangeLog');
      return;
    }

    const commEntry = new CommunicationChangeLogEntry(
      MeshAction.Rename,
      communication
    );
    commEntry.newName = newName;

    this.changeLogEntries.pushObject(commEntry);

    this.changeLogEntries = [...this.changeLogEntries];
    //this.trigger('showChangeLog');
  }

  deleteCommunicationEntry(communication: DrawableClassCommunication) {
    const foundEntry = this.findCommunicationLogEntry(
      communication.id,
      true
    ) as CommunicationChangeLogEntry;
    this.storeDeletedEntries(communication.id);
    let originalName = communication.operationName;
    if (foundEntry) {
      this.changeLogEntries.removeObject(foundEntry);
      if (foundEntry.action === MeshAction.Create) {
        //this.trigger('showChangeLog');
        return;
      }
      originalName = foundEntry.originalOperationName as string;
    }

    const commEntry = new CommunicationChangeLogEntry(
      MeshAction.Delete,
      communication
    );

    commEntry.originalOperationName = originalName;

    this.changeLogEntries.pushObject(commEntry);

    //this.trigger('showChangeLog');
  }

  /**
   * Retrieves the log text for all changelog entries.
   * @returns string with all log texts with each seperated by a new line
   */
  getChangeLog() {
    //let description = '';
    const logTexts: string[] = [];
    this.changeLogEntries.forEach((entry) => {
      // description = description.concat(entry._logText, '\n');
      logTexts.pushObject(entry._logText);
    });

    return logTexts;
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
    switch (entityType) {
      case EntityType.App: {
        const appEntries = this.changeLogEntries.filter(
          (entry) => entry instanceof AppChangeLogEntry
        ) as AppChangeLogEntry[];
        return appEntries.find((entry) => entry.app === entity);
      }
      case EntityType.Package: {
        const pckgEntries = this.changeLogEntries.filter(
          (entry) => entry instanceof PackageChangeLogEntry
        ) as PackageChangeLogEntry[];
        return pckgEntries.find((entry) => entry.pckg === entity);
      }
      case EntityType.SubPackage: {
        const subpckgEntries = this.changeLogEntries.filter(
          (entry) => entry instanceof SubPackageChangeLogEntry
        ) as SubPackageChangeLogEntry[];
        return subpckgEntries.find((entry) => entry.pckg === entity);
      }
      case EntityType.Clazz: {
        const clazzEntries = this.changeLogEntries.filter(
          (entry) => entry instanceof ClassChangeLogEntry
        ) as ClassChangeLogEntry[];
        return clazzEntries.find((entry) => entry.clazz === entity);
      }
      default:
        return undefined;
    }
  }

  private findCommunicationLogEntry(
    clazzOrId: Class | string,
    searchById: boolean = false
  ): BaseChangeLogEntry | undefined {
    return this.changeLogEntries.find((entry) => {
      if (entry instanceof CommunicationChangeLogEntry) {
        if (searchById) {
          return entry.communication?.id === clazzOrId;
        } else {
          return (
            entry.communication?.sourceClass === clazzOrId ||
            entry.communication?.targetClass === clazzOrId
          );
        }
      }
      return false;
    });
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

  /**
   * Removes changelog entries for packages and classes located under a specified package within a given application.
   * @param app The application containing the package of interest. Changelog entries within this application will be evaluated.
   * @param pckg The package of interest. Changelog entries under this package will be removed.
   */
  private removeLogEntriesUnderPackage(app: Application, pckg: Package) {
    const entriesToRemove: BaseChangeLogEntry[] = [];

    this.changeLogEntries.forEach((logEntry) => {
      // Check if some children have changelog entries and remove them
      if (
        (logEntry instanceof PackageChangeLogEntry ||
          logEntry instanceof SubPackageChangeLogEntry ||
          logEntry instanceof ClassChangeLogEntry) &&
        logEntry.app?.id === app.id
      ) {
        const ancestorPackages = getAncestorPackages(logEntry.pckg as Package);
        const affectedLogEntry =
          ancestorPackages.some(
            (ancestorPackages) => ancestorPackages.id === pckg.id
          ) || logEntry.pckg?.id === pckg.id;
        if (affectedLogEntry) {
          entriesToRemove.pushObject(logEntry);
        }
      }

      // Check if there are Communication Entries inside pckg, if there are then remove
      if (logEntry instanceof CommunicationChangeLogEntry) {
        if (
          logEntry.communication?.targetApp ===
          logEntry.communication?.sourceApp
        ) {
          if (logEntry.communication?.sourceApp?.id === app.id) {
            this.removeInternCommunicationsInsidePackage(
              logEntry,
              logEntry.communication.sourceClass.parent,
              logEntry.communication.targetClass.parent,
              pckg,
              entriesToRemove
            );
          }
        } else {
          if (logEntry.communication?.targetApp?.id === app.id) {
            this.removeExternCommunicationsInsidePackage(
              logEntry,
              logEntry.communication.targetClass.parent,
              pckg,
              entriesToRemove
            );
          } else if (logEntry.communication?.sourceApp?.id === app.id) {
            this.removeExternCommunicationsInsidePackage(
              logEntry,
              logEntry.communication.sourceClass.parent,
              pckg,
              entriesToRemove
            );
          }
        }
      }
    });

    if (entriesToRemove.length) {
      this.changeLogEntries.removeObjects(entriesToRemove);
    }
  }

  removeEntry(entry: BaseChangeLogEntry, collabMode: boolean = false) {
    if (!collabMode) {
      this.sender.sendChangeLogRemoveEntryMessage([entry.id]);
    }

    this.changeLogEntries.removeObject(entry);
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
    //this.trigger('showChangeLog');
  }

  private removeExternCommunicationsInsidePackage(
    logEntry: CommunicationChangeLogEntry,
    commPckg: Package,
    pckg: Package,
    entriesToRemove: BaseChangeLogEntry[]
  ) {
    const ancestorPackages = getAncestorPackages(commPckg);
    const affectedEntry =
      commPckg.id === pckg.id ||
      ancestorPackages.some((ancestorPckg) => ancestorPckg.id === pckg.id);
    if (affectedEntry) {
      entriesToRemove.pushObject(logEntry);
    }
  }

  private removeInternCommunicationsInsidePackage(
    logEntry: CommunicationChangeLogEntry,
    sourcePckg: Package,
    targetPckg: Package,
    pckg: Package,
    entriesToRemove: BaseChangeLogEntry[]
  ) {
    let ancestorPackages = getAncestorPackages(sourcePckg);
    let affectedEntry =
      sourcePckg.id === pckg.id ||
      ancestorPackages.some((ancestorPckg) => ancestorPckg.id === pckg.id);

    if (affectedEntry) {
      entriesToRemove.pushObject(logEntry);
      return;
    }
    ancestorPackages = getAncestorPackages(targetPckg);
    affectedEntry =
      targetPckg.id === pckg.id ||
      ancestorPackages.some((ancestorPckg) => ancestorPckg.id === pckg.id);

    if (affectedEntry) {
      entriesToRemove.pushObject(logEntry);
    }
  }

  private updateCreateLogEntries(
    app: Application,
    pckg: Package,
    destination: Application | Package,
    landscapeData: StructureLandscapeData
  ) {
    this.changeLogEntries.forEach((entry) => {
      if (entry.app?.id === app.id) {
        if (
          (entry instanceof PackageChangeLogEntry ||
            entry instanceof SubPackageChangeLogEntry) &&
          pckg.id === entry.pckg?.id
        ) {
          entry.updateOrigin(destination, landscapeData);
        } else if (entry instanceof ClassChangeLogEntry) {
          const ancestorPackages = getAncestorPackages(entry.pckg as Package);
          const affectedEntry =
            entry.pckg?.id === pckg.id ||
            ancestorPackages.some(
              (ancestorPackage) => ancestorPackage.id === pckg.id
            );
          if (
            affectedEntry &&
            (entry instanceof PackageChangeLogEntry ||
              entry instanceof SubPackageChangeLogEntry)
          )
            entry.updateOrigin(destination, landscapeData);
        }
      }
    });
  }

  private updateCutInserLogEntries(
    app: Application,
    pckg: Package,
    destination: Application | Package,
    landscapeData: StructureLandscapeData
  ) {
    this.changeLogEntries.forEach((entry) => {
      if (
        entry instanceof PackageChangeLogEntry &&
        entry.destinationApp?.id === app.id
      ) {
        if (entry.pckg?.id === pckg.id) {
          entry.setDestination(destination, landscapeData);
        }
      } else if (
        entry instanceof SubPackageChangeLogEntry &&
        entry.destinationApp?.id === app.id
      ) {
        if (entry.pckg?.id === pckg.id) {
          entry.setDestination(destination, landscapeData);
        }
      } else if (
        entry instanceof ClassChangeLogEntry &&
        entry.destinationApp?.id === app.id
      ) {
        const ancestorPackages = getAncestorPackages(entry.pckg as Package);
        const affectedEntry =
          entry.pckg?.id === pckg.id ||
          ancestorPackages.some(
            (ancestorPackage) => ancestorPackage.id === pckg.id
          );

        if (
          affectedEntry &&
          (entry instanceof PackageChangeLogEntry ||
            entry instanceof SubPackageChangeLogEntry)
        )
          entry.setDestination(destination, landscapeData);
      }
    });
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    changelog: Changelog;
  }
}
