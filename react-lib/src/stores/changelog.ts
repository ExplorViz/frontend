import { createStore } from 'zustand/vanilla';
// import {
//     AppChangeLogEntry,
//     BaseChangeLogEntry,
//     ClassChangeLogEntry,
//     CommunicationChangeLogEntry,
//     PackageChangeLogEntry,
//     SubPackageChangeLogEntry,
//   } from 'react-lib/src/utils/changelog-entry';

interface ChangelogState{
    // changeLogEntries: BaseChangeLogEntry[];
    // deletedChangeLogEntries: Map<string, BaseChangeLogEntry[]>;
}

export const useChangelogStore= createStore<ChangelogState>(() => ({
}));