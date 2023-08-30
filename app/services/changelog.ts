import Service from '@ember/service';
import {
  Application,
  Class,
  Package,
  StructureLandscapeData,
} from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import {
  MeshAction,
  ChangeLogEntry,
  EntityType,
} from 'explorviz-frontend/utils/change-log-entry';
import { getAncestorPackages } from 'explorviz-frontend/utils/package-helpers';

export default class Changelog extends Service.extend({
  // anything which *must* be merged to prototype here
}) {
  changeLogEntries: ChangeLogEntry[] = [];

  createAppEntry(app: Application) {
    const appEntry = new ChangeLogEntry(MeshAction.Create, app);
    this.changeLogEntries.push(appEntry);
  }

  createPackageEntry(app: Application, pckg: Package) {
    const pckgEntry = new ChangeLogEntry(MeshAction.Create, app, pckg);
    this.changeLogEntries.push(pckgEntry);
  }

  createClassEntry(app: Application, parentPckg: Package, clazz: Class) {
    const clazzEntry = new ChangeLogEntry(
      MeshAction.Create,
      app,
      parentPckg,
      clazz
    );
    this.changeLogEntries.push(clazzEntry);
  }

  renameAppEntry(app: Application, newName: string) {
    const entry = this.findChangeLogEntry(app);

    if (!entry || (entry && entry._entryType !== EntityType.App)) {
      const appEntry = new ChangeLogEntry(
        MeshAction.Rename,
        app,
        undefined,
        undefined,
        newName
      );
      this.changeLogEntries.push(appEntry);
    } else if (
      entry &&
      entry._entryType === EntityType.App &&
      (entry.action === MeshAction.Create || entry.action === MeshAction.Rename)
    ) {
      entry.newName = newName;
    }
  }

  renamePackageEntry(app: Application, pckg: Package, newName: string) {
    const entry = this.findChangeLogEntry(pckg);

    if (!entry) {
      const pckgEntry = new ChangeLogEntry(
        MeshAction.Rename,
        app,
        pckg,
        undefined,
        newName
      );
      this.changeLogEntries.push(pckgEntry);
    } else if (
      entry &&
      entry._entryType === EntityType.Package &&
      (entry.action === MeshAction.Create || entry.action === MeshAction.Rename)
    ) {
      entry.newName = newName;
    }
  }

  renameSubPackageEntry(app: Application, pckg: Package, newName: string) {
    const entry = this.findChangeLogEntry(pckg);

    if (!entry || (entry && entry.entryType === EntityType.Clazz)) {
      const pckgEntry = new ChangeLogEntry(
        MeshAction.Rename,
        app,
        pckg,
        undefined,
        newName
      );
      this.changeLogEntries.push(pckgEntry);
    } else if (
      entry &&
      entry._entryType === EntityType.SubPackage &&
      (entry.action === MeshAction.Create || entry.action === MeshAction.Rename)
    ) {
      entry.newName = newName;
    }
  }

  renameClassEntry(app: Application, clazz: Class, newName: string) {
    const entry = this.findChangeLogEntry(clazz);

    if (!entry) {
      const clazzEntry = new ChangeLogEntry(
        MeshAction.Rename,
        app,
        clazz.parent,
        clazz,
        newName
      );
      this.changeLogEntries.push(clazzEntry);
    } else if (
      entry &&
      entry._entryType === EntityType.Clazz &&
      (entry.action === MeshAction.Create || entry.action === MeshAction.Rename)
    ) {
      entry.newName = newName;
    }
  }

  deleteAppEntry(app: Application) {
    const entry = this.findChangeLogEntry(app);

    if (!entry || (entry && entry.action === MeshAction.CutInsert)) {
      const appEntry = new ChangeLogEntry(MeshAction.Delete, app);
      this.changeLogEntries.push(appEntry);
    } else if (
      entry &&
      entry._entryType === EntityType.App &&
      entry.action === MeshAction.Create
    ) {
      this.changeLogEntries = this.changeLogEntries.filter(
        (entry) => entry.app?.id !== app.id
      );
    } else if (
      (entry && entry.action !== MeshAction.Create) ||
      (entry &&
        entry._entryType !== EntityType.App &&
        entry.action === MeshAction.Create)
    ) {
      this.changeLogEntries = this.changeLogEntries.filter(
        (entry) => entry.app?.id !== app.id
      );
      const originalName = entry._originalAppName;
      const appEntry = new ChangeLogEntry(MeshAction.Delete, app);
      appEntry.updateOriginalAppName(originalName as string);
      this.changeLogEntries.push(appEntry);
    }
  }

  deletePackageEntry(app: Application, pckg: Package) {
    const entry = this.findChangeLogEntry(pckg);
    this.removeAffectedLogEntries(app, pckg);

    if (!entry || (entry && entry.action === MeshAction.CutInsert)) {
      const pckgEntry = new ChangeLogEntry(MeshAction.Delete, app, pckg);
      this.changeLogEntries.push(pckgEntry);
    } else if (
      entry &&
      entry._entryType !== EntityType.App &&
      entry.action === MeshAction.Create
    ) {
      this.changeLogEntries = this.changeLogEntries.filter(
        (entry) => entry.pckg?.id !== pckg.id
      );
    } else if (entry && entry.action !== MeshAction.Create) {
      this.changeLogEntries = this.changeLogEntries.filter(
        (entry) => entry.pckg?.id !== pckg.id
      );
      const pckgEntry = new ChangeLogEntry(MeshAction.Delete, app, pckg);
      this.changeLogEntries.push(pckgEntry);
    }
  }

  deleteSubPackageEntry(app: Application, pckg: Package) {
    const entry = this.findChangeLogEntry(pckg);
    this.removeAffectedLogEntries(app, pckg);

    if (!entry || (entry && entry.action === MeshAction.CutInsert)) {
      const pckgEntry = new ChangeLogEntry(MeshAction.Delete, app, pckg);
      this.changeLogEntries.push(pckgEntry);
    } else if (
      entry &&
      entry._entryType === EntityType.SubPackage &&
      entry.action === MeshAction.Create
    ) {
      this.changeLogEntries = this.changeLogEntries.filter(
        (entry) => entry.pckg?.id !== pckg.id
      );
    } else if (
      entry &&
      (entry._entryType === EntityType.SubPackage ||
        entry._entryType === EntityType.Clazz) &&
      entry.action !== MeshAction.Create
    ) {
      this.changeLogEntries = this.changeLogEntries.filter(
        (entry) => entry.pckg?.id !== pckg.id
      );
      const pckgEntry = new ChangeLogEntry(MeshAction.Delete, app, pckg);
      this.changeLogEntries.push(pckgEntry);
    }
  }

  deleteClassEntry(app: Application, clazz: Class) {
    const entry = this.findChangeLogEntry(clazz);
    const commEntry = this.findChangeLogCommunicationEntry(clazz);

    if (!entry) {
      const clazzEntry = new ChangeLogEntry(
        MeshAction.Delete,
        app,
        clazz.parent,
        clazz
      );
      this.changeLogEntries.push(clazzEntry);
    } else if (entry && entry.action === MeshAction.Create) {
      this.changeLogEntries.removeObject(entry);
    } else if (entry && entry.action !== MeshAction.Create) {
      this.changeLogEntries.removeObject(entry);
      const clazzEntry = new ChangeLogEntry(
        MeshAction.Delete,
        app,
        clazz.parent,
        clazz
      );
      this.changeLogEntries.push(clazzEntry);
    }

    if (commEntry) {
      this.changeLogEntries.removeObject(commEntry);
    }
  }

  cutAndInsertPackageEntry(
    app: Application,
    pckg: Package,
    destination: Application | Package,
    landscapeData: StructureLandscapeData
  ) {
    const entry = this.findChangeLogEntry(pckg);

    if (!entry || (entry && entry.action === MeshAction.Rename)) {
      const pckgEntry = new ChangeLogEntry(
        MeshAction.CutInsert,
        app,
        pckg,
        undefined,
        undefined,
        destination,
        landscapeData
      );
      this.changeLogEntries.push(pckgEntry);
    } else if (entry && entry.action === MeshAction.Create) {
      this.updateAffectedCreateLogEntries(
        app,
        pckg,
        destination,
        landscapeData
      );
    } else if (entry && entry.action !== MeshAction.Create) {
      this.updateAffectedCutInsertLogEntries(
        app,
        pckg,
        destination,
        landscapeData
      );
    }
  }

  cutAndInsertSubPackageEntry(
    app: Application,
    pckg: Package,
    destination: Application | Package,
    landscapeData: StructureLandscapeData
  ) {
    const entry = this.findChangeLogEntry(pckg);

    if (!entry || (entry && entry.action === MeshAction.Rename)) {
      const pckgEntry = new ChangeLogEntry(
        MeshAction.CutInsert,
        app,
        pckg,
        undefined,
        undefined,
        destination,
        landscapeData
      );
      this.changeLogEntries.push(pckgEntry);
    } else if (entry && entry.action === MeshAction.Create) {
      this.updateAffectedCreateLogEntries(
        app,
        pckg,
        destination,
        landscapeData
      );
    } else if (entry && entry.action !== MeshAction.Create) {
      this.updateAffectedCutInsertLogEntries(
        app,
        pckg,
        destination,
        landscapeData
      );
    }
  }

  cutAndInsertClassEntry(
    app: Application,
    clazz: Class,
    destination: Application | Package,
    landscapeData: StructureLandscapeData
  ) {
    const entry = this.findChangeLogEntry(clazz);

    if (!entry || (entry && entry.action === MeshAction.Rename)) {
      const clazzEntry = new ChangeLogEntry(
        MeshAction.CutInsert,
        app,
        clazz.parent,
        clazz,
        undefined,
        destination,
        landscapeData
      );
      this.changeLogEntries.push(clazzEntry);
    } else if (entry && entry.action === MeshAction.Create) {
      entry.updateCreateEntry(destination, landscapeData);
    } else if (entry && entry.action !== MeshAction.Create) {
      entry.updateDestination(destination, landscapeData);
    }
  }

  communicationEntry(
    sourceApp: Application,
    sourceClazz: Class,
    targetApp: Application,
    targetClass: Class,
    methodName: string,
    landscapeData: StructureLandscapeData
  ) {
    const commEntry = new ChangeLogEntry(
      MeshAction.Communication,
      sourceApp,
      sourceClazz.parent,
      sourceClazz,
      undefined,
      targetApp,
      landscapeData,
      targetClass,
      methodName
    );
    this.changeLogEntries.push(commEntry);
  }

  getChangeLogs() {
    let description = '';
    this.changeLogEntries.forEach((entry) => {
      description = description.concat(entry._description, '\n');
    });

    return description;
  }

  private findChangeLogEntry(
    app: Application | Package | Class
  ): ChangeLogEntry | undefined {
    return this.changeLogEntries.find(
      (entry) => entry.app === app || entry.pckg === app || entry.clazz === app
    );
  }

  private findChangeLogCommunicationEntry(
    app: Application | Package | Class
  ): ChangeLogEntry | undefined {
    return this.changeLogEntries.find(
      (entry) =>
        entry.action === MeshAction.Communication &&
        (entry.app === app ||
          entry.pckg === app ||
          entry.clazz === app ||
          entry.destinationApp === app ||
          entry.destinationClass === app)
    );
  }

  private removeAffectedLogEntries(app: Application, pckg: Package) {
    const entriesToRemove: ChangeLogEntry[] = [];

    this.changeLogEntries.forEach((logEntry) => {
      if (logEntry.app?.id === app.id && logEntry.pckg) {
        const ancestorPackages = getAncestorPackages(logEntry.pckg);
        const affectedEntry = ancestorPackages.some(
          (ancestorPckg) => ancestorPckg.id === pckg.id
        );
        if (affectedEntry) {
          entriesToRemove.push(logEntry);
        }
      }
      if (
        logEntry.action === MeshAction.Communication &&
        logEntry.destinationApp === app
      ) {
        const ancestorPackages = getAncestorPackages(
          logEntry.destinationClass?.parent as Package
        );
        const affectedEntry = ancestorPackages.some(
          (ancestorPckg) => ancestorPckg.id === pckg.id
        );
        if (affectedEntry) {
          entriesToRemove.push(logEntry);
        }
      } else if (
        logEntry.action === MeshAction.Communication &&
        logEntry.app === app
      ) {
        const ancestorPackages = getAncestorPackages(
          logEntry.clazz?.parent as Package
        );
        const affectedEntry = ancestorPackages.some(
          (ancestorPckg) => ancestorPckg.id === pckg.id
        );
        if (affectedEntry) {
          entriesToRemove.push(logEntry);
        }
      }
    });
    if (this.changeLogEntries.length)
      this.changeLogEntries.removeObjects(entriesToRemove);
  }

  private updateAffectedCreateLogEntries(
    app: Application,
    pckg: Package,
    destination: Application | Package,
    landscapeData: StructureLandscapeData
  ) {
    this.changeLogEntries.forEach((entry) => {
      if (entry.app?.id === app.id && entry.pckg) {
        if (pckg.id === entry.pckg.id) {
          entry.updateCreateEntry(destination, landscapeData);
        } else {
          const ancestorPackages = getAncestorPackages(entry.pckg);
          const affectedEntry = ancestorPackages.some(
            (ancestorPckg) => ancestorPckg.id === pckg.id
          );
          if (affectedEntry) {
            entry.updateCreateEntry(destination, landscapeData);
          }
        }
      }
    });
  }

  private updateAffectedCutInsertLogEntries(
    app: Application,
    pckg: Package,
    destination: Application | Package,
    landscapeData: StructureLandscapeData
  ) {
    this.changeLogEntries.forEach((entry) => {
      if (entry.destinationApp?.id === app.id && entry.pckg) {
        if (pckg.id === entry.pckg.id) {
          entry.updateDestination(destination, landscapeData);
        } else {
          const ancestorPackages = getAncestorPackages(entry.pckg);
          const affectedEntry = ancestorPackages.some(
            (ancestorPckg) => ancestorPckg.id === pckg.id
          );
          if (affectedEntry) {
            entry.updateDestination(destination, landscapeData);
          }
        }
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
