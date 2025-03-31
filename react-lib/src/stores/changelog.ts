import { create } from 'zustand';
import {
  AppChangeLogEntry,
  BaseChangeLogEntry,
  ClassChangeLogEntry,
  CommunicationChangeLogEntry,
  PackageChangeLogEntry,
  SubPackageChangeLogEntry,
} from 'explorviz-frontend/src/utils/changelog-entry';
import {
  Application,
  Class,
  Package,
  StructureLandscapeData,
} from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import {
  RestructureAction,
  EntityType,
  changeID,
} from 'explorviz-frontend/src/utils/restructure-helper';
import { getAncestorPackages } from 'explorviz-frontend/src/utils/package-helpers';
import { useMessageSenderStore } from 'explorviz-frontend/src/stores/collaboration/message-sender';
import ClassCommunication from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/class-communication';
import eventEmitter from '../utils/event-emitter';

interface ChangelogState {
  changeLogEntries: BaseChangeLogEntry[]; // tracked
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
  deleteAppEntry: (app: Application, undoInsert?: boolean) => void;
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
  restoreDeletedEntries: (key: string, collabMode?: boolean) => void;
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
  removeEntry: (entry: BaseChangeLogEntry, collabMode?: boolean) => void;
  removeEntries: (entries: BaseChangeLogEntry[], collabMode?: boolean) => void;
  __removeExternCommunicationsInsidePackage: (
    logEntry: CommunicationChangeLogEntry,
    commPckg: Package,
    pckg: Package,
    entriesToRemove: BaseChangeLogEntry[]
  ) => void;
  _removeInternCommunicationsInsidePackage: (
    logEntry: CommunicationChangeLogEntry,
    sourcePckg: Package,
    targetPckg: Package,
    pckg: Package,
    entriesToRemove: BaseChangeLogEntry[]
  ) => void;
  _updateCreateLogEntries: (
    app: Application,
    pckg: Package,
    destination: Application | Package,
    landscapeData: StructureLandscapeData
  ) => void;
  _updateCutInserLogEntries: (
    app: Application,
    pckg: Package,
    destination: Application | Package,
    landscapeData: StructureLandscapeData
  ) => void;
}

export const useChangelogStore = create<ChangelogState>((set, get) => ({
  changeLogEntries: [],
  deletedChangeLogEntries: new Map<string, BaseChangeLogEntry[]>(),

  resetChangeLog: () => {
    set({ changeLogEntries: [] });
    set({ deletedChangeLogEntries: new Map() });
  },

  createAppEntry: (app: Application, pckg: Package, clazz: Class) => {
    const appLogEntry = new AppChangeLogEntry(RestructureAction.Create, app);

    set({ changeLogEntries: [...get().changeLogEntries, appLogEntry] });
    get().createPackageEntry(app, pckg, clazz, appLogEntry);
    eventEmitter.emit('showChangeLog');
  },

  createPackageEntry: (
    app: Application,
    pckg: Package,
    clazz: Class,
    appEntry?: AppChangeLogEntry
  ) => {
    if (pckg.parent) {
      const pckgLogEntry = new SubPackageChangeLogEntry(
        RestructureAction.Create,
        app,
        pckg
      );

      set({ changeLogEntries: [...get().changeLogEntries, pckgLogEntry] });
      get().createClassEntry(app, clazz, pckgLogEntry);
    } else {
      const pckgLogEntry = new PackageChangeLogEntry(
        RestructureAction.Create,
        app,
        pckg
      );

      if (appEntry) pckgLogEntry._createdWithApp = appEntry;

      set({ changeLogEntries: [...get().changeLogEntries, pckgLogEntry] });
      get().createClassEntry(app, clazz, pckgLogEntry);
      eventEmitter.emit('showChangeLog');
    }
  },

  createClassEntry: (
    app: Application,
    clazz: Class,
    pckgEntry?: PackageChangeLogEntry | SubPackageChangeLogEntry
  ) => {
    const clazzLogEntry = new ClassChangeLogEntry(
      RestructureAction.Create,
      app,
      clazz
    );
    if (pckgEntry) clazzLogEntry.createdWithPackage = pckgEntry;
    set({ changeLogEntries: [...get().changeLogEntries, clazzLogEntry] });
    eventEmitter.emit('showChangeLog');
  },

  // TODO: Rename methods could be generalized by giving the class type of the ChangeLogEntry as parameter
  renameAppEntry: (app: Application, newName: string) => {
    const foundEntry = get().findBaseChangeLogEntry(EntityType.App, app);
    if (!foundEntry) {
      const appLogEntry = new AppChangeLogEntry(RestructureAction.Rename, app);
      appLogEntry.newName = newName;
      set({ changeLogEntries: [...get().changeLogEntries, appLogEntry] });
    } else {
      let newChangeLogEntries = get().changeLogEntries.filter(
        (c) => c != foundEntry
      );
      if (foundEntry.app && foundEntry.action === RestructureAction.Create) {
        foundEntry.app.name = newName;
      } else {
        foundEntry.newName = newName;
      }
      newChangeLogEntries.push(foundEntry);
      set({ changeLogEntries: newChangeLogEntries });
    }
    eventEmitter.emit('showChangeLog');
  },

  renamePackageEntry: (app: Application, pckg: Package, newName: string) => {
    const foundEntry = get().findBaseChangeLogEntry(
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
      set({ changeLogEntries: [...get().changeLogEntries, pckgLogEntry] });
    } else {
      let newChangeLogEntries = get().changeLogEntries.filter(
        (c) => c != foundEntry
      );
      if (
        foundEntry.action === RestructureAction.Create ||
        foundEntry.action === RestructureAction.CutInsert
      ) {
        foundEntry.pckg.name = newName;
      } else {
        foundEntry.newName = newName;
      }
      newChangeLogEntries.push(foundEntry);
      set({ changeLogEntries: newChangeLogEntries });
    }
    eventEmitter.emit('showChangeLog');
  },

  renameSubPackageEntry: (app: Application, pckg: Package, newName: string) => {
    const foundEntry = get().findBaseChangeLogEntry(
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
      set({ changeLogEntries: [...get().changeLogEntries, pckgLogEntry] });
    } else {
      let newChangeLogEntries = get().changeLogEntries.filter(
        (c) => c != foundEntry
      );
      if (
        foundEntry.action === RestructureAction.Create ||
        foundEntry.action === RestructureAction.CutInsert
      ) {
        foundEntry.pckg.name = newName;
      } else {
        foundEntry.newName = newName;
      }
      newChangeLogEntries.push(foundEntry);
      set({ changeLogEntries: newChangeLogEntries });
    }
    eventEmitter.emit('showChangeLog');
  },

  renameClassEntry: (app: Application, clazz: Class, newName: string) => {
    const foundEntry = get().findBaseChangeLogEntry(
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
      set({ changeLogEntries: [...get().changeLogEntries, clazzLogEntry] });
    } else {
      let newChangeLogEntries = get().changeLogEntries.filter(
        (c) => c != foundEntry
      );
      if (foundEntry.action === RestructureAction.Create) {
        foundEntry.clazz.name = newName;
      } else {
        foundEntry.newName = newName;
      }
      newChangeLogEntries.push(foundEntry);
      set({ changeLogEntries: newChangeLogEntries });
    }
    eventEmitter.emit('showChangeLog');
  },

  deleteAppEntry: (app: Application, undoInsert: boolean = false) => {
    const foundEntry = get().findBaseChangeLogEntry(
      EntityType.App,
      app
    ) as AppChangeLogEntry;
    let originalAppName = '';

    get().storeDeletedEntries(app.id);

    set({
      changeLogEntries: [
        ...get().changeLogEntries.filter((entry) => {
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
        }),
      ],
    });
    if (foundEntry) {
      if (foundEntry.action === RestructureAction.Create) {
        eventEmitter.emit('showChangeLog');
        return;
      }
      originalAppName = foundEntry.originalAppName as string;
    }

    if (undoInsert) {
      return;
    }

    const appLogEntry = new AppChangeLogEntry(RestructureAction.Delete, app);
    get().addToDeletedEntriesMap(app.id, appLogEntry);

    if (originalAppName !== '') appLogEntry.originalAppName = originalAppName;
    set({ changeLogEntries: [...get().changeLogEntries, appLogEntry] });
    eventEmitter.emit('showChangeLog');
  },

  storeDeletedEntries(key: string) {
    if (!get().changeLogEntries.length) return;
    const deletedEntries: BaseChangeLogEntry[] = [];
    get().changeLogEntries.forEach((entry) => {
      deletedEntries.push(entry);
    });
    let newDeletedChangeLogEntries = get().deletedChangeLogEntries;
    newDeletedChangeLogEntries.set(key, deletedEntries);
    set({ deletedChangeLogEntries: newDeletedChangeLogEntries });
  },

  deleteSubPackageEntry(
    app: Application,
    pckg: Package,
    undoInsert: boolean = false
  ) {
    const foundEntry = get().findBaseChangeLogEntry(
      EntityType.SubPackage,
      pckg
    ) as SubPackageChangeLogEntry;

    // We don't want to undo the undo, thats why we dont store the data then
    if (!undoInsert) get().storeDeletedEntries(pckg.id);

    get().removeLogEntriesUnderPackage(app, pckg);

    let originalPckgName = '';

    if (foundEntry) {
      // TODO: fix
      set({
        changeLogEntries: get().changeLogEntries.filter(
          (entry: SubPackageChangeLogEntry) => entry.pckg?.id !== pckg.id
        ),
      });
      if (foundEntry.action === RestructureAction.Create) {
        eventEmitter.emit('showChangeLog');
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

    get().addToDeletedEntriesMap(pckg.id, pckgLogEntry);
    if (originalPckgName !== '') {
      pckgLogEntry.originalPckgName = originalPckgName;
    }
    set({ changeLogEntries: [...get().changeLogEntries, pckgLogEntry] });
    eventEmitter.emit('showChangeLog');
  },

  addToDeletedEntriesMap: (key: string, entry: BaseChangeLogEntry) => {
    let newDeletedChangeLogEntries = get().deletedChangeLogEntries;
    newDeletedChangeLogEntries.set(key, [
      ...newDeletedChangeLogEntries.get(key)!,
      entry,
    ]);
    set({ deletedChangeLogEntries: newDeletedChangeLogEntries });
  },

  deletePackageEntry: (
    app: Application,
    pckg: Package,
    undoInsert: boolean = false
  ) => {
    const foundEntry = get().findBaseChangeLogEntry(
      EntityType.Package,
      pckg
    ) as PackageChangeLogEntry;

    if (!undoInsert) get().storeDeletedEntries(pckg.id);

    // We don't want to undo the undo, thats why we dont store the data then
    get().removeLogEntriesUnderPackage(app, pckg);

    let originalPckgName = '';

    if (foundEntry) {
      set({
        changeLogEntries: get().changeLogEntries.filter(
          (entry: PackageChangeLogEntry) => entry.pckg?.id !== pckg.id
        ),
      });
      if (foundEntry.action === RestructureAction.Create) {
        eventEmitter.emit('showChangeLog');
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

    get().addToDeletedEntriesMap(pckg.id, pckgLogEntry);

    if (originalPckgName !== '') {
      pckgLogEntry.originalPckgName = originalPckgName;
    }

    set({ changeLogEntries: [...get().changeLogEntries, pckgLogEntry] });
    eventEmitter.emit('showChangeLog');
  },

  deleteClassEntry(
    app: Application,
    clazz: Class,
    undoInsert: boolean = false
  ) {
    const foundEntry = get().findBaseChangeLogEntry(
      EntityType.Clazz,
      clazz
    ) as ClassChangeLogEntry;
    const commEntry = get().findCommunicationLogEntry(clazz, false);

    // We don't want to undo the undo, thats why we dont store the data then
    if (!undoInsert) {
      get().storeDeletedEntries(clazz.id);
    }

    // Remove Communication Log Entry
    if (commEntry) {
      set({
        changeLogEntries: get().changeLogEntries.filter((c) => c != commEntry),
      });
    }

    let originalClazzName = '';
    if (foundEntry) {
      set({
        changeLogEntries: get().changeLogEntries.filter(
          (entry: ClassChangeLogEntry) => entry.clazz?.id !== clazz.id
        ),
      });
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

    get().addToDeletedEntriesMap(clazz.id, clazzLogEntry);
    if (originalClazzName !== '') {
      clazzLogEntry.originalClazzName = originalClazzName;
    }
    set({ changeLogEntries: [...get().changeLogEntries, clazzLogEntry] });
  },

  duplicateAppEntry: (app: Application) => {
    const appLogEntry = new AppChangeLogEntry(RestructureAction.CopyPaste, app);
    set({ changeLogEntries: [...get().changeLogEntries, appLogEntry] });
  },

  copyPackageEntry: (
    app: Application,
    pckg: Package,
    destination: Application | Package,
    original: Package,
    landscapeData: StructureLandscapeData
  ) => {
    const pckgLogEntry = new PackageChangeLogEntry(
      RestructureAction.CopyPaste,
      app,
      pckg
    );
    pckgLogEntry.setDestination(destination, landscapeData);
    pckgLogEntry.setOriginal(original);
    set({ changeLogEntries: [...get().changeLogEntries, pckgLogEntry] });
  },

  copySubPackageEntry: (
    app: Application,
    pckg: Package,
    destination: Application | Package,
    original: Package,
    landscapeData: StructureLandscapeData
  ) => {
    const pckgLogEntry = new PackageChangeLogEntry(
      RestructureAction.CopyPaste,
      app,
      pckg
    );
    pckgLogEntry.setDestination(destination, landscapeData);
    pckgLogEntry.setOriginal(original);
    set({ changeLogEntries: [...get().changeLogEntries, pckgLogEntry] });
  },

  copyClassEntry: (
    app: Application,
    clazz: Class,
    destination: Package,
    original: Class,
    landscapeData: StructureLandscapeData
  ) => {
    const clazzLogEntry = new ClassChangeLogEntry(
      RestructureAction.CopyPaste,
      app,
      clazz
    );
    clazzLogEntry.setDestination(destination, landscapeData);
    clazzLogEntry.setOriginal(original);
    set({ changeLogEntries: [...get().changeLogEntries, clazzLogEntry] });
  },

  movePackageEntry: (
    app: Application,
    pckg: Package,
    destination: Application | Package,
    original: Package,
    landscapeData: StructureLandscapeData
  ) => {
    const foundEntry =
      get().findBaseChangeLogEntry(EntityType.Package, pckg) ||
      get().findBaseChangeLogEntry(EntityType.SubPackage, pckg);
    if (foundEntry) {
      if (foundEntry.action == RestructureAction.Create) {
        get()._updateCreateLogEntries(app, pckg, destination, landscapeData);
      } else {
        get()._updateCutInserLogEntries(app, pckg, destination, landscapeData);
      }
    } else {
      const pckgLogEntry = new PackageChangeLogEntry(
        RestructureAction.CutInsert,
        app,
        pckg
      );
      pckgLogEntry.setDestination(destination, landscapeData);
      pckgLogEntry.setOriginal(original);
      set({ changeLogEntries: [...get().changeLogEntries, pckgLogEntry] });
    }
    eventEmitter.emit('showChangeLog');
  },

  moveSubPackageEntry: (
    app: Application,
    pckg: Package,
    destination: Application | Package,
    original: Package,
    landscapeData: StructureLandscapeData
  ) => {
    const foundEntry =
      get().findBaseChangeLogEntry(EntityType.SubPackage, pckg) ||
      get().findBaseChangeLogEntry(EntityType.Package, pckg);

    if (foundEntry) {
      if (foundEntry.action == RestructureAction.Create) {
        get()._updateCreateLogEntries(app, pckg, destination, landscapeData);
      } else {
        get()._updateCutInserLogEntries(app, pckg, destination, landscapeData);
      }
    } else {
      const pckgLogEntry = new SubPackageChangeLogEntry(
        RestructureAction.CutInsert,
        app,
        pckg
      );
      pckgLogEntry.setDestination(destination, landscapeData);
      pckgLogEntry.setOriginal(original);
      set({ changeLogEntries: [...get().changeLogEntries, pckgLogEntry] });
    }
    eventEmitter.emit('showChangeLog');
  },

  // TODO: Check if foundEntry operation will update state
  moveClassEntry: (
    app: Application,
    clazz: Class,
    destination: Package,
    origin: Class,
    landscapeData: StructureLandscapeData
  ) => {
    const foundEntry = get().findBaseChangeLogEntry(
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
      set({ changeLogEntries: [...get().changeLogEntries, clazzLogEntry] });
    }
    eventEmitter.emit('showChangeLog');
  },

  communicationEntry: (communication: ClassCommunication) => {
    const commEntry = new CommunicationChangeLogEntry(
      RestructureAction.Create,
      communication
    );
    set({ changeLogEntries: [...get().changeLogEntries, commEntry] });
    eventEmitter.emit('showChangeLog');
  },

  // TODO: Check if foundEntry operations will update the state
  renameOperationEntry: (
    communication: ClassCommunication,
    newName: string
  ) => {
    const foundEntry = get().findCommunicationLogEntry(communication.id, true);
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
      eventEmitter.emit('showChangeLog');
      return;
    }
    const commEntry = new CommunicationChangeLogEntry(
      RestructureAction.Rename,
      communication
    );
    commEntry.newName = newName;
    set({ changeLogEntries: [...get().changeLogEntries, commEntry] });
    eventEmitter.emit('showChangeLog');
  },

  deleteCommunicationEntry: (communication: ClassCommunication) => {
    const foundEntry = get().findCommunicationLogEntry(
      communication.id,
      true
    ) as CommunicationChangeLogEntry;
    get().storeDeletedEntries(communication.id);
    let originalName = communication.operationName;
    if (foundEntry) {
      set({
        changeLogEntries: get().changeLogEntries.filter((c) => c != foundEntry),
      });
      if (foundEntry.action === RestructureAction.Create) {
        eventEmitter.emit('showChangeLog');
        return;
      }
      originalName = foundEntry.originalOperationName as string;
    }
    const commEntry = new CommunicationChangeLogEntry(
      RestructureAction.Delete,
      communication
    );
    commEntry.originalOperationName = originalName;
    set({ changeLogEntries: [...get().changeLogEntries, commEntry] });
    eventEmitter.emit('showChangeLog');
  },

  /**
   * Retrieves the log text for all changelog entries.
   * @returns string with all log texts with each seperated by a new line
   */
  getChangeLog: () => {
    //let description = '';
    const logTexts: string[] = [];
    get().changeLogEntries.forEach((entry) => {
      // description = description.concat(entry._logText, '\n');
      logTexts.push(entry._logText);
    });
    return logTexts;
  },

  /**
   * Restores entries that were previously removed due to a delete operation.
   * It fetches the last set of deleted entries and puts them into the main log.
   */
  restoreDeletedEntries: (key: string, collabMode: boolean = false) => {
    if (!collabMode) {
      useMessageSenderStore.getState().sendChangeLogRestoreEntriesMessage(key);
    }
    const deletedEntries = get().deletedChangeLogEntries.get(key);
    if (!deletedEntries?.length) return;

    const lastEntry = deletedEntries.pop();

    const index = get().changeLogEntries.findIndex(
      (entry) => entry.id === lastEntry?.id
    );

    set({
      changeLogEntries: get().changeLogEntries.splice(
        0,
        index + 1,
        ...deletedEntries
      ),
    });

    // TODO: Check if this loop works after migration!
    for (const deletedList of get().deletedChangeLogEntries.values()) {
      const index = deletedList.findIndex((deleted) => {
        return deleted.id === lastEntry!.id;
      });

      if (index === -1) continue;

      deletedList.splice(0, index + 1, ...deletedEntries);
    }

    let newDeletedChangeLogEntries = get().deletedChangeLogEntries;
    newDeletedChangeLogEntries.delete(key);
    set({ deletedChangeLogEntries: newDeletedChangeLogEntries });

    eventEmitter.emit('showChangeLog');
  },

  findBaseChangeLogEntry: (
    entityType: EntityType,
    entity: Application | Package | Class
  ) => {
    switch (entityType) {
      case EntityType.App: {
        const appEntries = get().changeLogEntries.filter(
          (entry) => entry instanceof AppChangeLogEntry
        ) as AppChangeLogEntry[];
        return appEntries.find((entry) => entry.app === entity);
      }
      case EntityType.Package: {
        const pckgEntries = get().changeLogEntries.filter(
          (entry) => entry instanceof PackageChangeLogEntry
        ) as PackageChangeLogEntry[];
        return pckgEntries.find((entry) => entry.pckg === entity);
      }
      case EntityType.SubPackage: {
        const subpckgEntries = get().changeLogEntries.filter(
          (entry) => entry instanceof SubPackageChangeLogEntry
        ) as SubPackageChangeLogEntry[];
        return subpckgEntries.find((entry) => entry.pckg === entity);
      }
      case EntityType.Clazz: {
        const clazzEntries = get().changeLogEntries.filter(
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
    return get().changeLogEntries.find((entry) => {
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

  /**
   * Removes changelog entries for packages and classes located under a specified package within a given application.
   * @param app The application containing the package of interest. Changelog entries within this application will be evaluated.
   * @param pckg The package of interest. Changelog entries under this package will be removed.
   */
  removeLogEntriesUnderPackage: (app: Application, pckg: Package) => {
    const entriesToRemove: BaseChangeLogEntry[] = [];

    get().changeLogEntries.forEach((logEntry) => {
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
            get()._removeInternCommunicationsInsidePackage(
              logEntry,
              logEntry.communication.sourceClass.parent,
              logEntry.communication.targetClass.parent,
              pckg,
              entriesToRemove
            );
          }
        } else {
          if (logEntry.communication?.targetApp?.id === app.id) {
            get().__removeExternCommunicationsInsidePackage(
              logEntry,
              logEntry.communication.targetClass.parent,
              pckg,
              entriesToRemove
            );
          } else if (logEntry.communication?.sourceApp?.id === app.id) {
            get().__removeExternCommunicationsInsidePackage(
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
      set({
        changeLogEntries: get().changeLogEntries.filter(
          (c) => !entriesToRemove.includes(c)
        ),
      });
    }
  },

  removeEntry: (entry: BaseChangeLogEntry, collabMode: boolean = false) => {
    if (!collabMode) {
      useMessageSenderStore
        .getState()
        .sendChangeLogRemoveEntryMessage([entry.id]);
    }

    set({ changeLogEntries: get().changeLogEntries.filter((c) => c != entry) });

    for (let deletedList of get().deletedChangeLogEntries.values()) {
      deletedList = deletedList.filter((d) => d != entry);
    }
    eventEmitter.emit('showChangeLog');
  },

  removeEntries(entries: BaseChangeLogEntry[], collabMode: boolean = false) {
    if (!collabMode) {
      const ids: string[] = [];
      get().changeLogEntries.forEach((entry) => {
        ids.push(entry.id);
      });
      useMessageSenderStore.getState().sendChangeLogRemoveEntryMessage(ids);
    }

    set({
      changeLogEntries: get().changeLogEntries.filter(
        (c) => !entries.includes(c)
      ),
    });

    for (const deletedList of this.deletedChangeLogEntries.values()) {
      deletedList.remove(entries);
    }
    eventEmitter.emit('showChangeLog');
  },

  __removeExternCommunicationsInsidePackage: (
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
      entriesToRemove.push(logEntry);
    }
  },

  _removeInternCommunicationsInsidePackage: (
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
  },

  _updateCreateLogEntries: (
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

  _updateCutInserLogEntries: (
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
