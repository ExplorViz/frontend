import { createStore } from "zustand/vanilla";
import {
  AppChangeLogEntry,
  BaseChangeLogEntry,
  ClassChangeLogEntry,
  CommunicationChangeLogEntry,
  PackageChangeLogEntry,
  SubPackageChangeLogEntry,
} from "react-lib/src/utils/changelog-entry";
import {
  Application,
  Class,
  Package,
  StructureLandscapeData,
} from "react-lib/src/utils/landscape-schemes/structure-data";
import {
  RestructureAction,
  EntityType,
} from "react-lib/src/utils/restructure-helper";
import { getAncestorPackages } from "react-lib/src/utils/package-helpers";
import ClassCommunication from "react-lib/src/utils/landscape-schemes/dynamic/class-communication";

interface ChangelogState {
  changeLogEntries: BaseChangeLogEntry[];
  deletedChangeLogEntries: Map<string, BaseChangeLogEntry[]>;
  resetChangeLog: () => void;
  createAppEntry: (app: Application, pckg: Package, clazz: Class) => void;
  createPackageEntry: (
    app: Application,
    pckg: Package,
    clazz: Class,
    appEntry?: AppChangeLogEntry
  ) => void;
  createClassEntry: (
    app: Application,
    clazz: Class,
    pckgEntry?: PackageChangeLogEntry | SubPackageChangeLogEntry
  ) => void;
  renameAppEntry: (app: Application, newName: string) => void;
  renamePackageEntry: (
    app: Application,
    pckg: Package,
    newName: string
  ) => void;
  renameSubPackageEntry: (
    app: Application,
    pckg: Package,
    newName: string
  ) => void;
  renameClassEntry: (app: Application, clazz: Class, newName: string) => void;
  deleteAppEntry: (app: Application, undoInsert: boolean) => void;
  storeDeletedEntries: (key: string) => void;
  addToDeletedEntriesMap: (key: string, entry: BaseChangeLogEntry) => void;
  deletePackageEntry: (
    app: Application,
    pckg: Package,
    undoInsert: boolean
  ) => void;
  deleteSubPackageEntry: (
    app: Application,
    pckg: Package,
    undoInsert: boolean
  ) => void;
  deleteClassEntry: (
    app: Application,
    clazz: Class,
    undoInsert: boolean
  ) => void;
  duplicateAppEntry: (app: Application) => void;
  copyPackageEntry: (
    app: Application,
    pckg: Package,
    destination: Application | Package,
    original: Package,
    landscapeData: StructureLandscapeData
  ) => void;
  copySubPackageEntry: (
    app: Application,
    pckg: Package,
    destination: Application | Package,
    original: Package,
    landscapeData: StructureLandscapeData
  ) => void;
  copyClassEntry: (
    app: Application,
    clazz: Class,
    destination: Package,
    original: Class,
    landscapeData: StructureLandscapeData
  ) => void;
  movePackageEntry: (
    app: Application,
    pckg: Package,
    destination: Application | Package,
    original: Package,
    landscapeData: StructureLandscapeData
  ) => void;
  moveSubPackageEntry: (
    app: Application,
    pckg: Package,
    destination: Application | Package,
    original: Package,
    landscapeData: StructureLandscapeData
  ) => void;
  moveClassEntry: (
    app: Application,
    clazz: Class,
    destination: Package,
    origin: Class,
    landscapeData: StructureLandscapeData
  ) => void;
  communicationEntry: (communication: ClassCommunication) => void;
  renameOperationEntry: (
    communication: ClassCommunication,
    newName: string
  ) => void;
  deleteCommunicationEntry: (communication: ClassCommunication) => void;
  getChangeLog: () => string[];
  //restoreDeletedEntries:(key: string, collabMode: boolean = false) => don't know the return type;
  findBaseChangeLogEntry: (
    entityType: EntityType,
    entity: Application | Package | Class
  ) => BaseChangeLogEntry | undefined;
  findCommunicationLogEntry: (
    clazzOrId: Class | string,
    searchById: boolean
  ) => BaseChangeLogEntry | undefined;
  isCreateBundle: (
    entry: BaseChangeLogEntry,
    bundledEntries: BaseChangeLogEntry[]
  ) => BaseChangeLogEntry[] | undefined;
  removeLogEntriesUnderPackage: (app: Application, pckg: Package) => void;
  // removeEntry:(entry: BaseChangeLogEntry, collabMode: boolean = false) => void;
  removeExternCommunicationsInsidePackage: (
    logEntry: CommunicationChangeLogEntry,
    commPckg: Package,
    pckg: Package,
    entriesToRemove: BaseChangeLogEntry[]
  ) => void;
  removeInternCommunicationsInsidePackage: (
    logEntry: CommunicationChangeLogEntry,
    sourcePckg: Package,
    targetPckg: Package,
    pckg: Package,
    entriesToRemove: BaseChangeLogEntry[]
  ) => void;
  updateCreateLogEntries: (
    app: Application,
    pckg: Package,
    destination: Application | Package,
    landscapeData: StructureLandscapeData
  ) => void;
  updateCutInserLogEntries: (
    app: Application,
    pckg: Package,
    destination: Application | Package,
    landscapeData: StructureLandscapeData
  ) => void;
}

export const useChangelogStore = createStore<ChangelogState>((set, get) => ({
  changeLogEntries: [],
  deletedChangeLogEntries: new Map<string, BaseChangeLogEntry[]>(),
  resetChangeLog: () => {
    const state = get();
    state.changeLogEntries = [];
    state.deletedChangeLogEntries = new Map();
  },
  createAppEntry: (app: Application, pckg: Package, clazz: Class) => {
    const state = get();
    const appLogEntry = new AppChangeLogEntry(RestructureAction.Create, app);

    state.changeLogEntries.pushObject(appLogEntry);
    state.createPackageEntry(app, pckg, clazz, appLogEntry);
  },
  createPackageEntry: (
    app: Application,
    pckg: Package,
    clazz: Class,
    appEntry?: AppChangeLogEntry
  ) => {
    const state = get();
    if (pckg.parent) {
      const pckgLogEntry = new SubPackageChangeLogEntry(
        RestructureAction.Create,
        app,
        pckg
      );

      state.changeLogEntries.pushObject(pckgLogEntry);
      state.createClassEntry(app, clazz, pckgLogEntry);
    } else {
      const pckgLogEntry = new PackageChangeLogEntry(
        RestructureAction.Create,
        app,
        pckg
      );

      if (appEntry) pckgLogEntry._createdWithApp = appEntry;

      state.changeLogEntries.pushObject(pckgLogEntry);
      state.createClassEntry(app, clazz, pckgLogEntry);
    }
  },
  createClassEntry: (
    app: Application,
    clazz: Class,
    pckgEntry?: PackageChangeLogEntry | SubPackageChangeLogEntry
  ) => {
    const state = get();
    const clazzLogEntry = new ClassChangeLogEntry(
      RestructureAction.Create,
      app,
      clazz
    );
    if (pckgEntry) clazzLogEntry.createdWithPackage = pckgEntry;
    state.changeLogEntries.pushObject(clazzLogEntry);
  },
  renameAppEntry: (app: Application, newName: string) => {
    const state = get();
    const foundEntry = state.findBaseChangeLogEntry(EntityType.App, app);
    if (!foundEntry) {
      const appLogEntry = new AppChangeLogEntry(RestructureAction.Rename, app);
      appLogEntry.newName = newName;
      state.changeLogEntries.pushObject(appLogEntry);
    } else {
      if (foundEntry.app && foundEntry.action === RestructureAction.Create) {
        foundEntry.app.name = newName;
      } else {
        foundEntry.newName = newName;
      }
    }
  },
  renamePackageEntry: (app: Application, pckg: Package, newName: string) => {
    const state = get();
    const foundEntry = state.findBaseChangeLogEntry(
      EntityType.Package,
      pckg
    ) as PackageChangeLogEntry;

    if (!foundEntry) {
      const pckgLogEntry = new PackageChangeLogEntry(
        RestructureAction.Rename,
        app,
        pckg
      );
      pckgLogEntry.newName = newName;
      state.changeLogEntries.pushObject(pckgLogEntry);
    } else {
      if (
        foundEntry.action === RestructureAction.Create ||
        foundEntry.action === RestructureAction.CutInsert
      ) {
        foundEntry.pckg.name = newName;
      } else {
        foundEntry.newName = newName;
      }
    }
  },
  renameSubPackageEntry: (app: Application, pckg: Package, newName: string) => {
    const state = get();
    const foundEntry = state.findBaseChangeLogEntry(
      EntityType.SubPackage,
      pckg
    ) as SubPackageChangeLogEntry;

    if (!foundEntry) {
      const pckgLogEntry = new SubPackageChangeLogEntry(
        RestructureAction.Rename,
        app,
        pckg
      );
      pckgLogEntry.newName = newName;
      state.changeLogEntries.pushObject(pckgLogEntry);
    } else {
      if (
        foundEntry.action === RestructureAction.Create ||
        foundEntry.action === RestructureAction.CutInsert
      ) {
        foundEntry.pckg.name = newName;
      } else {
        foundEntry.newName = newName;
      }
    }
  },
  renameClassEntry: (app: Application, clazz: Class, newName: string) => {
    const state = get();
    const foundEntry = state.findBaseChangeLogEntry(
      EntityType.Clazz,
      clazz
    ) as ClassChangeLogEntry;

    if (!foundEntry || foundEntry.action === RestructureAction.CutInsert) {
      const clazzLogEntry = new ClassChangeLogEntry(
        RestructureAction.Rename,
        app,
        clazz
      );
      clazzLogEntry.newName = newName;
      state.changeLogEntries.pushObject(clazzLogEntry);
    } else {
      if (foundEntry.action === RestructureAction.Create) {
        foundEntry.clazz.name = newName;
      } else {
        foundEntry.newName = newName;
      }
    }
  },
  deleteAppEntry: (app: Application, undoInsert: boolean = false) => {
    const state = get();
    const foundEntry = state.findBaseChangeLogEntry(
      EntityType.App,
      app
    ) as AppChangeLogEntry;
    let originalAppName = "";

    state.storeDeletedEntries(app.id);

    state.changeLogEntries = state.changeLogEntries.filter((entry) => {
      if (!(entry instanceof CommunicationChangeLogEntry)) {
        if (entry.action === RestructureAction.CopyPaste) {
          if (entry instanceof AppChangeLogEntry) {
            return entry.app?.id !== app.id;
          } else if (
            entry instanceof PackageChangeLogEntry ||
            entry instanceof SubPackageChangeLogEntry ||
            entry instanceof ClassChangeLogEntry
          ) {
            // We only want to remove the copy&paste entry when we delete the destination of the copied and not the source!
            return entry.destinationApp?.id !== app.id;
          } else {
            // should never happen, since there are no copy paste actions for comms
            return;
          }
        } else {
          return entry.app?.id !== app.id;
        }
      } else {
        return (
          entry.communication?.sourceApp?.id !== app.id &&
          entry.communication?.targetApp?.id !== app.id
        );
      }
    });
    if (foundEntry) {
      if (foundEntry.action === RestructureAction.Create) {
        //this.trigger('showChangeLog');
        return;
      }
      originalAppName = foundEntry.originalAppName as string;
    }

    if (undoInsert) {
      return;
    }

    const appLogEntry = new AppChangeLogEntry(RestructureAction.Delete, app);
    state.addToDeletedEntriesMap(app.id, appLogEntry);

    if (originalAppName !== "") appLogEntry.originalAppName = originalAppName;
    state.changeLogEntries.pushObject(appLogEntry);
  },
  storeDeletedEntries(key: string) {
    const state = get();
    if (!state.changeLogEntries.length) return;
    const deletedEntries: BaseChangeLogEntry[] = [];
    state.changeLogEntries.forEach((entry) => {
      deletedEntries.pushObject(entry);
    });
    state.deletedChangeLogEntries.set(key, deletedEntries);
  },
  deleteSubPackageEntry(
    app: Application,
    pckg: Package,
    undoInsert: boolean = false
  ) {
    const state = get();
    const foundEntry = state.findBaseChangeLogEntry(
      EntityType.SubPackage,
      pckg
    ) as SubPackageChangeLogEntry;

    // We don't want to undo the undo, thats why we dont store the data then
    if (!undoInsert) state.storeDeletedEntries(pckg.id);

    state.removeLogEntriesUnderPackage(app, pckg);

    let originalPckgName = "";

    if (foundEntry) {
      state.changeLogEntries = state.changeLogEntries.filter(
        (entry: SubPackageChangeLogEntry) => entry.pckg?.id !== pckg.id
      );
      if (foundEntry.action === RestructureAction.Create) {
        //this.trigger('showChangeLog');
        return;
      } else if (foundEntry.action === RestructureAction.Rename) {
        originalPckgName = foundEntry.originalPckgName as string;
      }
    }

    if (undoInsert) {
      return;
    }

    const pckgLogEntry = new SubPackageChangeLogEntry(
      RestructureAction.Delete,
      app,
      pckg
    );

    state.addToDeletedEntriesMap(pckg.id, pckgLogEntry);
    if (originalPckgName !== "") {
      pckgLogEntry.originalPckgName = originalPckgName;
    }
    state.changeLogEntries.pushObject(pckgLogEntry);
    //this.trigger('showChangeLog');
  },
  addToDeletedEntriesMap: (key: string, entry: BaseChangeLogEntry) => {
    const state = get();
    const deletedEntries = state.deletedChangeLogEntries.get(key);
    deletedEntries?.pushObject(entry);
  },
  deletePackageEntry: (
    app: Application,
    pckg: Package,
    undoInsert: boolean = false
  ) => {
    const state = get();
    const foundEntry = state.findBaseChangeLogEntry(
      EntityType.Package,
      pckg
    ) as PackageChangeLogEntry;

    if (!undoInsert) state.storeDeletedEntries(pckg.id);

    // We don't want to undo the undo, thats why we dont store the data then
    state.removeLogEntriesUnderPackage(app, pckg);

    let originalPckgName = "";

    if (foundEntry) {
      state.changeLogEntries = state.changeLogEntries.filter(
        (entry: PackageChangeLogEntry) => entry.pckg?.id !== pckg.id
      );
      if (foundEntry.action === RestructureAction.Create) {
        //this.trigger('showChangeLog');
        return;
      } else if (foundEntry.action === RestructureAction.Rename) {
        originalPckgName = foundEntry.originalPckgName as string;
      }
    }

    if (undoInsert) {
      return;
    }

    const pckgLogEntry = new PackageChangeLogEntry(
      RestructureAction.Delete,
      app,
      pckg
    );

    state.addToDeletedEntriesMap(pckg.id, pckgLogEntry);

    if (originalPckgName !== "") {
      pckgLogEntry.originalPckgName = originalPckgName;
    }

    state.changeLogEntries.pushObject(pckgLogEntry);
    //this.trigger('showChangeLog');
  },
  deleteClassEntry(
    app: Application,
    clazz: Class,
    undoInsert: boolean = false
  ) {
    const state = get();
    const foundEntry = state.findBaseChangeLogEntry(
      EntityType.Clazz,
      clazz
    ) as ClassChangeLogEntry;
    const commEntry = state.findCommunicationLogEntry(clazz, false);

    // We don't want to undo the undo, thats why we dont store the data then
    if (!undoInsert) {
      state.storeDeletedEntries(clazz.id);
    }

    // Remove Communication Log Entry
    if (commEntry) state.changeLogEntries.removeObject(commEntry);

    let originalClazzName = "";
    if (foundEntry) {
      state.changeLogEntries = state.changeLogEntries.filter(
        (entry: ClassChangeLogEntry) => entry.clazz?.id !== clazz.id
      );
      if (foundEntry.action === RestructureAction.Create) {
        return;
      } else if (foundEntry.action === RestructureAction.Rename) {
        originalClazzName = foundEntry.originalClazzName as string;
      }
    }

    if (undoInsert) {
      return;
    }

    const clazzLogEntry = new ClassChangeLogEntry(
      RestructureAction.Delete,
      app,
      clazz
    );

    state.addToDeletedEntriesMap(clazz.id, clazzLogEntry);
    if (originalClazzName !== "") {
      clazzLogEntry.originalClazzName = originalClazzName;
    }
    state.changeLogEntries.pushObject(clazzLogEntry);
  },
  duplicateAppEntry: (app: Application) => {
    const state = get();
    const appLogEntry = new AppChangeLogEntry(RestructureAction.CopyPaste, app);
    state.changeLogEntries.pushObject(appLogEntry);
  },
  copyPackageEntry: (
    app: Application,
    pckg: Package,
    destination: Application | Package,
    original: Package,
    landscapeData: StructureLandscapeData
  ) => {
    const state = get();
    const pckgLogEntry = new PackageChangeLogEntry(
      RestructureAction.CopyPaste,
      app,
      pckg
    );
    pckgLogEntry.setDestination(destination, landscapeData);
    pckgLogEntry.setOriginal(original);
    state.changeLogEntries.pushObject(pckgLogEntry);
  },
  copySubPackageEntry: (
    app: Application,
    pckg: Package,
    destination: Application | Package,
    original: Package,
    landscapeData: StructureLandscapeData
  ) => {
    const state = get();
    const pckgLogEntry = new PackageChangeLogEntry(
      RestructureAction.CopyPaste,
      app,
      pckg
    );
    pckgLogEntry.setDestination(destination, landscapeData);
    pckgLogEntry.setOriginal(original);
    state.changeLogEntries.pushObject(pckgLogEntry);
  },
  copyClassEntry: (
    app: Application,
    clazz: Class,
    destination: Package,
    original: Class,
    landscapeData: StructureLandscapeData
  ) => {
    const state = get();
    const clazzLogEntry = new ClassChangeLogEntry(
      RestructureAction.CopyPaste,
      app,
      clazz
    );
    clazzLogEntry.setDestination(destination, landscapeData);
    clazzLogEntry.setOriginal(original);
    state.changeLogEntries.pushObject(clazzLogEntry);
  },
  movePackageEntry: (
    app: Application,
    pckg: Package,
    destination: Application | Package,
    original: Package,
    landscapeData: StructureLandscapeData
  ) => {
    const state = get();
    const foundEntry =
      state.findBaseChangeLogEntry(EntityType.Package, pckg) ||
      state.findBaseChangeLogEntry(EntityType.SubPackage, pckg);
    if (foundEntry) {
      if (foundEntry.action == RestructureAction.Create) {
        state.updateCreateLogEntries(app, pckg, destination, landscapeData);
      } else {
        state.updateCutInserLogEntries(app, pckg, destination, landscapeData);
      }
    } else {
      const pckgLogEntry = new PackageChangeLogEntry(
        RestructureAction.CutInsert,
        app,
        pckg
      );
      pckgLogEntry.setDestination(destination, landscapeData);
      pckgLogEntry.setOriginal(original);
      state.changeLogEntries.pushObject(pckgLogEntry);
    }
  },
  moveSubPackageEntry: (
    app: Application,
    pckg: Package,
    destination: Application | Package,
    original: Package,
    landscapeData: StructureLandscapeData
  ) => {
    const state = get();
    const foundEntry =
      state.findBaseChangeLogEntry(EntityType.SubPackage, pckg) ||
      state.findBaseChangeLogEntry(EntityType.Package, pckg);

    if (foundEntry) {
      if (foundEntry.action == RestructureAction.Create) {
        state.updateCreateLogEntries(app, pckg, destination, landscapeData);
      } else {
        state.updateCutInserLogEntries(app, pckg, destination, landscapeData);
      }
    } else {
      const pckgLogEntry = new SubPackageChangeLogEntry(
        RestructureAction.CutInsert,
        app,
        pckg
      );
      pckgLogEntry.setDestination(destination, landscapeData);
      pckgLogEntry.setOriginal(original);
      state.changeLogEntries.pushObject(pckgLogEntry);
    }
  },
  moveClassEntry: (
    app: Application,
    clazz: Class,
    destination: Package,
    origin: Class,
    landscapeData: StructureLandscapeData
  ) => {
    const state = get();
    const foundEntry = state.findBaseChangeLogEntry(
      EntityType.Clazz,
      clazz
    ) as ClassChangeLogEntry;

    if (foundEntry) {
      if (foundEntry.action === RestructureAction.Create) {
        foundEntry.updateOriginApp(destination, landscapeData);
      } else {
        foundEntry.setDestination(destination, landscapeData);
      }
    } else {
      const clazzLogEntry = new ClassChangeLogEntry(
        RestructureAction.CutInsert,
        app,
        clazz
      );
      clazzLogEntry.setDestination(destination, landscapeData);
      clazzLogEntry.setOriginal(origin);
      state.changeLogEntries.pushObject(clazzLogEntry);
    }
  },
  communicationEntry: (communication: ClassCommunication) => {
    const state = get();
    const commEntry = new CommunicationChangeLogEntry(
      RestructureAction.Create,
      communication
    );
    state.changeLogEntries.pushObject(commEntry);
  },
  renameOperationEntry: (
    communication: ClassCommunication,
    newName: string
  ) => {
    const state = get();
    const foundEntry = state.findCommunicationLogEntry(communication.id, true);
    if (
      foundEntry &&
      foundEntry instanceof CommunicationChangeLogEntry &&
      foundEntry.communication
    ) {
      if (foundEntry.action === RestructureAction.Create) {
        foundEntry.communication.operationName = newName;
      } else if (foundEntry.action === RestructureAction.Rename) {
        foundEntry.newName = newName;
      }
      return;
    }
    const commEntry = new CommunicationChangeLogEntry(
      RestructureAction.Rename,
      communication
    );
    commEntry.newName = newName;
    state.changeLogEntries.pushObject(commEntry);
    state.changeLogEntries = [...state.changeLogEntries];
  },
  deleteCommunicationEntry: (communication: ClassCommunication) => {
    const state = get();
    const foundEntry = state.findCommunicationLogEntry(
      communication.id,
      true
    ) as CommunicationChangeLogEntry;
    state.storeDeletedEntries(communication.id);
    let originalName = communication.operationName;
    if (foundEntry) {
      state.changeLogEntries.removeObject(foundEntry);
      if (foundEntry.action === RestructureAction.Create) {
        return;
      }
      originalName = foundEntry.originalOperationName as string;
    }
    const commEntry = new CommunicationChangeLogEntry(
      RestructureAction.Delete,
      communication
    );
    commEntry.originalOperationName = originalName;
    state.changeLogEntries.pushObject(commEntry);
  },
  getChangeLog: () => {
    const state = get();
    //let description = '';
    const logTexts: string[] = [];
    state.changeLogEntries.forEach((entry) => {
      // description = description.concat(entry._logText, '\n');
      logTexts.pushObject(entry._logText);
    });
    return logTexts;
  },
  //   restoreDeletedEntries:(key: string, collabMode: boolean = false) => {
  //     const state = get();
  //     if (!collabMode) {
  //         state.sender.sendChangeLogRestoreEntriesMessage(key);
  //     }
  //     const deletedEntries = state.deletedChangeLogEntries.get(key);
  //     if (!deletedEntries?.length) return;

  //     const lastEntry = deletedEntries.popObject();

  //     const index = state.changeLogEntries.findIndex(
  //       (entry) => entry.id === lastEntry?.id
  //     );

  //     state.changeLogEntries.splice(0, index + 1, ...deletedEntries);
  //     state.changeLogEntries = [...state.changeLogEntries];

  //     for (const deletedList of state.deletedChangeLogEntries.values()) {
  //       const index = deletedList.findIndex((deleted) => {
  //         return deleted.id === lastEntry.id;
  //       });

  //       if (index === -1) continue;

  //       deletedList.splice(0, index + 1, ...deletedEntries);
  //     }

  //     state.deletedChangeLogEntries.delete(key);

  //     //this.trigger('showChangeLog');
  //   }
  findBaseChangeLogEntry: (
    entityType: EntityType,
    entity: Application | Package | Class
  ) => {
    const state = get();
    switch (entityType) {
      case EntityType.App: {
        const appEntries = state.changeLogEntries.filter(
          (entry) => entry instanceof AppChangeLogEntry
        ) as AppChangeLogEntry[];
        return appEntries.find((entry) => entry.app === entity);
      }
      case EntityType.Package: {
        const pckgEntries = state.changeLogEntries.filter(
          (entry) => entry instanceof PackageChangeLogEntry
        ) as PackageChangeLogEntry[];
        return pckgEntries.find((entry) => entry.pckg === entity);
      }
      case EntityType.SubPackage: {
        const subpckgEntries = state.changeLogEntries.filter(
          (entry) => entry instanceof SubPackageChangeLogEntry
        ) as SubPackageChangeLogEntry[];
        return subpckgEntries.find((entry) => entry.pckg === entity);
      }
      case EntityType.Clazz: {
        const clazzEntries = state.changeLogEntries.filter(
          (entry) => entry instanceof ClassChangeLogEntry
        ) as ClassChangeLogEntry[];
        return clazzEntries.find((entry) => entry.clazz === entity);
      }
      default:
        return undefined;
    }
  },
  findCommunicationLogEntry: (
    clazzOrId: Class | string,
    searchById: boolean = false
  ) => {
    const state = get();
    return state.changeLogEntries.find((entry) => {
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
  },
  isCreateBundle: (
    entry: BaseChangeLogEntry,
    bundledEntries: BaseChangeLogEntry[]
  ) => {
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
      return get().isCreateBundle(entry.createdWithPackage, bundledEntries);
    }

    return undefined;
  },
  removeLogEntriesUnderPackage: (app: Application, pckg: Package) => {
    const state = get();
    const entriesToRemove: BaseChangeLogEntry[] = [];

    state.changeLogEntries.forEach((logEntry) => {
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
            state.removeInternCommunicationsInsidePackage(
              logEntry,
              logEntry.communication.sourceClass.parent,
              logEntry.communication.targetClass.parent,
              pckg,
              entriesToRemove
            );
          }
        } else {
          if (logEntry.communication?.targetApp?.id === app.id) {
            state.removeExternCommunicationsInsidePackage(
              logEntry,
              logEntry.communication.targetClass.parent,
              pckg,
              entriesToRemove
            );
          } else if (logEntry.communication?.sourceApp?.id === app.id) {
            state.removeExternCommunicationsInsidePackage(
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
      state.changeLogEntries.removeObjects(entriesToRemove);
    }
  },
  //   removeEntry:(entry: BaseChangeLogEntry, collabMode: boolean = false) =>{
  //     if (!collabMode) {
  //       this.sender.sendChangeLogRemoveEntryMessage([entry.id]);
  //     }

  //     this.changeLogEntries.removeObject(entry);

  //     for (const deletedList of this.deletedChangeLogEntries.values()) {
  //       deletedList.removeObject(entry);
  //     }
  //     //this.trigger('showChangeLog');
  //   },
  removeExternCommunicationsInsidePackage: (
    logEntry: CommunicationChangeLogEntry,
    commPckg: Package,
    pckg: Package,
    entriesToRemove: BaseChangeLogEntry[]
  ) => {
    const ancestorPackages = getAncestorPackages(commPckg);
    const affectedEntry =
      commPckg.id === pckg.id ||
      ancestorPackages.some((ancestorPckg) => ancestorPckg.id === pckg.id);
    if (affectedEntry) {
      entriesToRemove.pushObject(logEntry);
    }
  },
  removeInternCommunicationsInsidePackage: (
    logEntry: CommunicationChangeLogEntry,
    sourcePckg: Package,
    targetPckg: Package,
    pckg: Package,
    entriesToRemove: BaseChangeLogEntry[]
  ) => {
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
  },
  updateCreateLogEntries: (
    app: Application,
    pckg: Package,
    destination: Application | Package,
    landscapeData: StructureLandscapeData
  ) => {
    get().changeLogEntries.forEach((entry) => {
      if (entry.app?.id === app.id) {
        if (
          (entry instanceof PackageChangeLogEntry ||
            entry instanceof SubPackageChangeLogEntry) &&
          pckg.id === entry.pckg?.id
        ) {
          entry.updateOriginApp(destination, landscapeData);
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
            entry.updateOriginApp(destination, landscapeData);
        }
      }
    });
  },
  updateCutInserLogEntries: (
    app: Application,
    pckg: Package,
    destination: Application | Package,
    landscapeData: StructureLandscapeData
  ) => {
    get().changeLogEntries.forEach((entry) => {
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
  },
}));
