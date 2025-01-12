import { createStore } from 'zustand/vanilla';
// import {
//     CommitTree,
//     AppNameCommitTreeMap,
//     CommitComparison,
//   } from 'react-lib/src/utils/evolution-schemes/evolution-data';

interface EvolutionDataRepositoryState{
    // _appNameCommitTreeMap:AppNameCommitTreeMap;
}

export const useEvolutionDataRepositoryeState = createStore<EvolutionDataRepositoryState>(() => ({
    // _appNameCommitTreeMap: new Map(),
}));