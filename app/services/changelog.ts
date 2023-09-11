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
} from 'explorviz-frontend/utils/change-log-entry';
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
  deletedChangeLogEntries: BaseChangeLogEntry[][] = [];

  createAppEntry(app: Application, pckg: Package, clazz: Class) {
    const appLogEntry = new AppChangeLogEntry(MeshAction.Create, app);

    this.changeLogEntries.push(appLogEntry);
    this.createPackageEntry(app, pckg, clazz, appLogEntry);

    this.trigger('showChangeLog');
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

      this.changeLogEntries.push(pckgLogEntry);
      this.createClassEntry(app, clazz, pckgLogEntry);
    } else {
      const pckgLogEntry = new PackageChangeLogEntry(
        MeshAction.Create,
        app,
        pckg
      );

      if (appEntry) pckgLogEntry._createdWithApp = appEntry;

      this.changeLogEntries.push(pckgLogEntry);
      this.createClassEntry(app, clazz, pckgLogEntry);
    }
    this.trigger('showChangeLog');
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
    this.changeLogEntries.push(clazzLogEntry);
    this.trigger('showChangeLog');
  }

  renameAppEntry(app: Application, newName: string) {
    const foundEntry = this.findBaseChangeLogEntry(EntityType.App, app);

    if (!foundEntry) {
      const appLogEntry = new AppChangeLogEntry(MeshAction.Rename, app);
      appLogEntry.newName = newName;
      this.changeLogEntries.push(appLogEntry);
    } else {
      foundEntry.newName = newName;
    }
    this.trigger('showChangeLog');
  }

  renamePackageEntry(app: Application, pckg: Package, newName: string) {
    const foundEntry = this.findBaseChangeLogEntry(EntityType.Package, pckg);

    if (!foundEntry) {
      const pckgLogEntry = new PackageChangeLogEntry(
        MeshAction.Rename,
        app,
        pckg
      );
      pckgLogEntry.newName = newName;
      this.changeLogEntries.push(pckgLogEntry);
    } else {
      foundEntry.newName = newName;
    }
    this.trigger('showChangeLog');
  }

  renameSubPackageEntry(app: Application, pckg: Package, newName: string) {
    const foundEntry = this.findBaseChangeLogEntry(EntityType.SubPackage, pckg);

    if (!foundEntry) {
      const pckgLogEntry = new SubPackageChangeLogEntry(
        MeshAction.Rename,
        app,
        pckg
      );
      pckgLogEntry.newName = newName;
      this.changeLogEntries.push(pckgLogEntry);
    } else {
      foundEntry.newName = newName;
    }
    this.trigger('showChangeLog');
  }

  renameClassEntry(app: Application, clazz: Class, newName: string) {
    const foundEntry = this.findBaseChangeLogEntry(EntityType.Clazz, clazz);

    if (!foundEntry) {
      const clazzLogEntry = new ClassChangeLogEntry(
        MeshAction.Rename,
        app,
        clazz
      );
      clazzLogEntry.newName = newName;
      this.changeLogEntries.push(clazzLogEntry);
    } else {
      foundEntry.newName = newName;
    }
    this.trigger('showChangeLog');
  }

  deleteAppEntry(app: Application, undoInsert: boolean = false) {
    const foundEntry = this.findBaseChangeLogEntry(
      EntityType.App,
      app
    ) as AppChangeLogEntry;
    let originalAppName = '';

    this.storeDeletedEntries();

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
        this.trigger('showChangeLog');
        return;
      }
      originalAppName = foundEntry.originalAppName as string;
    }

    if (undoInsert) {
      return;
    }
    const appLogEntry = new AppChangeLogEntry(MeshAction.Delete, app);
    if (originalAppName !== '') appLogEntry.originalAppName = originalAppName;
    this.changeLogEntries.push(appLogEntry);
    this.trigger('showChangeLog');
  }

  deletePackageEntry(
    app: Application,
    pckg: Package,
    undoInsert: boolean = false
  ) {
    const foundEntry = this.findBaseChangeLogEntry(EntityType.Package, pckg);
    this.storeDeletedEntries();

    this.removeLogEntriesUnderPackage(app, pckg);

    let originalPckgName = '';

    if (foundEntry) {
      this.changeLogEntries = this.changeLogEntries.filter(
        (entry) => entry.pckg?.id !== pckg.id
      );
      if (foundEntry.action === MeshAction.Create) {
        this.trigger('showChangeLog');
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
    if (originalPckgName !== '') {
      pckgLogEntry.originalPckgName = originalPckgName;
    }

    this.changeLogEntries.push(pckgLogEntry);
    this.trigger('showChangeLog');
  }

  private storeDeletedEntries() {
    const deletedEntries: BaseChangeLogEntry[] = [];
    this.changeLogEntries.forEach((entry) => {
      deletedEntries.push(entry);
    });
    this.deletedChangeLogEntries.push(deletedEntries);
  }

  deleteSubPackageEntry(
    app: Application,
    pckg: Package,
    undoInsert: boolean = false
  ) {
    const foundEntry = this.findBaseChangeLogEntry(EntityType.SubPackage, pckg);
    this.storeDeletedEntries();

    this.removeLogEntriesUnderPackage(app, pckg);

    let originalPckgName = '';

    if (foundEntry) {
      this.changeLogEntries = this.changeLogEntries.filter(
        (entry) => entry.pckg?.id !== pckg.id
      );
      if (foundEntry.action === MeshAction.Create) {
        this.trigger('showChangeLog');
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
    if (originalPckgName !== '') {
      pckgLogEntry.originalPckgName = originalPckgName;
    }
    this.changeLogEntries.push(pckgLogEntry);
    this.trigger('showChangeLog');
  }

  deleteClassEntry(
    app: Application,
    clazz: Class,
    undoInsert: boolean = false
  ) {
    const foundEntry = this.findBaseChangeLogEntry(EntityType.Clazz, clazz);
    const commEntry = this.findCommunicationLogEntry(clazz);
    this.storeDeletedEntries();

    // Remove Communication Log Entry
    if (commEntry) this.changeLogEntries.removeObject(commEntry);

    let originalClazzName = '';
    if (foundEntry) {
      this.changeLogEntries = this.changeLogEntries.filter(
        (entry) => entry.clazz?.id !== clazz.id
      );
      if (foundEntry.action === MeshAction.Create) {
        this.trigger('showChangeLog');
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
    if (originalClazzName !== '') {
      clazzLogEntry.originalClazzName = originalClazzName;
    }
    this.changeLogEntries.push(clazzLogEntry);
    this.trigger('showChangeLog');
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
      this.changeLogEntries.push(pckgLogEntry);
    }
    this.trigger('showChangeLog');
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
      this.changeLogEntries.push(pckgLogEntry);
    }
    this.trigger('showChangeLog');
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
      this.changeLogEntries.push(clazzLogEntry);
    }
    this.trigger('showChangeLog');
  }

  communicationEntry(communication: DrawableClassCommunication) {
    const commEntry = new CommunicationChangeLogEntry(
      MeshAction.Create,
      communication
    );
    this.changeLogEntries.push(commEntry);
    this.trigger('showChangeLog');
  }

  /**
   * Retrieves the log text for all changelog entries.
   * @returns string with all log texts with each seperated by a new line
   */
  getChangeLog() {
    let description = '';

    this.changeLogEntries.forEach((entry) => {
      description = description.concat(entry._logText, '\n');
    });

    return description;
  }

  /**
   * Restores entries that were previously removed due to a delete operation.
   * It fetches the last set of deleted entries and puts them into the main log.
   */
  restoreDeletedEntries(collabMode: boolean = false) {
    if (!collabMode) {
      this.sender.sendChangeLogRestoreEntriesMessage();
    }

    const deletedEntries = this.deletedChangeLogEntries.reverse()
      .firstObject as BaseChangeLogEntry[];

    this.changeLogEntries = deletedEntries;

    this.deletedChangeLogEntries.removeObject(deletedEntries);
    this.trigger('showChangeLog');
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
    clazz: Class
  ): BaseChangeLogEntry | undefined {
    return this.changeLogEntries.find(
      (entry) =>
        entry instanceof CommunicationChangeLogEntry &&
        (entry.communication?.sourceClass === clazz ||
          entry.communication?.targetClass === clazz)
    );
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
          entriesToRemove.push(logEntry);
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
    this.trigger('showChangeLog');
  }

  removeEntries(entries: BaseChangeLogEntry[], collabMode: boolean = false) {
    if (!collabMode) {
      const ids: string[] = [];
      this.changeLogEntries.forEach((entry) => {
        ids.push(entry.id);
      });
      this.sender.sendChangeLogRemoveEntryMessage(ids);
    }

    this.changeLogEntries.removeObjects(entries);
    this.trigger('showChangeLog');
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
      entriesToRemove.push(logEntry);
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
      entriesToRemove.push(logEntry);
      return;
    }
    ancestorPackages = getAncestorPackages(targetPckg);
    affectedEntry =
      targetPckg.id === pckg.id ||
      ancestorPackages.some((ancestorPckg) => ancestorPckg.id === pckg.id);

    if (affectedEntry) {
      entriesToRemove.push(logEntry);
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
        } else {
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
      } else {
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
