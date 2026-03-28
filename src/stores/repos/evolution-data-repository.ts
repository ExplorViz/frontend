import {
  SelectedCommit,
  useCommitTreeStateStore,
} from 'explorviz-frontend/src/stores/commit-tree-state';
import { useEvolutionDataFetchServiceStore } from 'explorviz-frontend/src/stores/evolution-data-fetch-service';
import {
  CommitComparison,
  CommitTree,
  RepoNameCommitTreeMap
} from 'explorviz-frontend/src/utils/evolution-schemes/evolution-data';
import { Building, FlatLandscape } from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import { StructureLandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import {
  combineStructureLandscapeData,
  createEmptyStructureLandscapeData,
} from 'explorviz-frontend/src/utils/landscape-structure-helpers';
import { ApplicationMetricsCode } from 'explorviz-frontend/src/utils/metric-schemes/metric-data';
import { SelectedBuildingMetric } from 'explorviz-frontend/src/utils/settings/settings-schemas';
import { create } from 'zustand';

interface EvolutionDataRepositoryState {
  _repoNameCommitTreeMap: RepoNameCommitTreeMap;
  _evolutionStructureLandscapeData: Map<string, StructureLandscapeData>;
  _combinedStructureLandscapeData: StructureLandscapeData;
  _appNameToCommitIdToApplicationMetricsCodeMap: Map<
    string,
    Map<string, ApplicationMetricsCode>
  >; // CC-TODO: Wird sich über die COmmit-Comparison ändern oder wegfallen
  _commitsToCommitComparisonMap: Map<string, CommitComparison>;
  _repoNameToFlatLandscapeMap: Map<string, FlatLandscape>;
  getCommitComparisonByAppName: (
    appName: string
  ) => CommitComparison | undefined;
  getRepoNameToFlatLandscapeMap: () => Map<string, FlatLandscape>;
  fetchAndStoreRepositoryCommitTrees: () => Promise<boolean>;
  fetchAndStoreEvolutuinDataForSelectedCommitsNEW: (
      repositoryName: string,
      selectedCommits: SelectedCommit[]
    ) => Promise<void>;
  fetchAndStoreEvolutionDataForSelectedCommits: (
    appNameToSelectedCommits: Map<string, SelectedCommit[]>
  ) => Promise<void>;
  resetAllEvolutionData: () => void;
  resetStructureLandscapeData: () => void;
  resetAppNameToCommitIdToApplicationMetricsCodeMap: () => void;
  resetEvolutionStructureLandscapeData: () => void;
  resetRepoNameCommitTreeMap: () => void;
  resetCommitsToCommitComparisonMap: () => void;
  _fetchMetricsForAppAndCommits: (
    appName: string,
    selectedCommits: SelectedCommit[],
    newAppNameToCommitIdToApplicationMetricsCodeMap: Map<
      string,
      Map<string, ApplicationMetricsCode>
    >
  ) => Promise<void>;
  _fetchCommitComparisonForAppAndCommits: (
    appName: string,
    selectedCommits: SelectedCommit[],
    newCommitsToCommitComparisonMap: Map<string, CommitComparison>
  ) => Promise<void>;
  _buildRepoNameCommitTreeMap: (
      repositoryNames: string[]
    ) => Promise<RepoNameCommitTreeMap>;
  _fetchCommitTreeForRepoName: (
    repoName: string
  ) => Promise<CommitTree | undefined>;
  getMetricForBuilding: (
    building: Building | undefined,
    metricKey: string
  ) => number;
}

export const useEvolutionDataRepositoryStore =
  create<EvolutionDataRepositoryState>((set, get) => ({
    _repoNameCommitTreeMap: new Map<string, CommitTree>(),
    _evolutionStructureLandscapeData: new Map<string, StructureLandscapeData>(),
    _combinedStructureLandscapeData: createEmptyStructureLandscapeData(),
    _appNameToCommitIdToApplicationMetricsCodeMap: new Map<
      string,
      Map<string, ApplicationMetricsCode>
    >(),
    _commitsToCommitComparisonMap: new Map<string, CommitComparison>(),
    _repoNameToFlatLandscapeMap: new Map<string, FlatLandscape>(),


    // CC-TODO: Fliegt raus
    getCommitComparisonByAppName: (
      appName: string
    ): CommitComparison | undefined => {
      const selectedCommits =
        useCommitTreeStateStore.getState().getSelectedCommits().get(appName) ??
        [];

      if (selectedCommits.length !== 2) {
        return undefined;
      }

      const [firstCommit, secondCommit] = selectedCommits;
      const mapKey = `${firstCommit.commitId}-${secondCommit.commitId}`;

      const commitComparison = get()._commitsToCommitComparisonMap.get(mapKey);

      if (!commitComparison || commitComparison.addedPackageFqns) {
        return commitComparison;
      }

      // ToDo: This should be refactored in code service such that this is not necessary
      const addedPackagesWithFqn: string[] = [];
      commitComparison.addedPackages.forEach((addedPackage, index) => {
        const classFqn = commitComparison.added[index];
        if (!classFqn) return;
        const packageSuffixesNo = addedPackage.split('.').length - 1;
        for (let index = 0; index < packageSuffixesNo; index++) {
          const endIndex = classFqn.lastIndexOf('.');
          addedPackagesWithFqn.push(classFqn.substring(0, endIndex));
        }
      });
      commitComparison.addedPackageFqns = addedPackagesWithFqn;

      // ToDo: This should be refactored in code service such that this is not necessary
      const deletedPackagesWithFqn: string[] = [];
      commitComparison.deletedPackages.forEach((deletedPackage, index) => {
        const classFqn = commitComparison.deleted[index];
        if (!classFqn) return;
        const packageSuffixesNo = deletedPackage.split('.').length - 1;
        for (let index = 0; index < packageSuffixesNo; index++) {
          const endIndex = classFqn.lastIndexOf('.');
          deletedPackagesWithFqn.push(classFqn.substring(0, endIndex));
        }
      });
      commitComparison.deletedPackageFqns = deletedPackagesWithFqn;

      return commitComparison;
    },

    getRepoNameToFlatLandscapeMap: (): Map<string, FlatLandscape> => {
      return get()._repoNameToFlatLandscapeMap;
    },

    fetchAndStoreRepositoryCommitTrees: async (): Promise<boolean> => {
      try {
        const repositoryNames = await useEvolutionDataFetchServiceStore
          .getState()
          .fetchRepositories();
        const repoNameCommitTreeMap =
          await get()._buildRepoNameCommitTreeMap(repositoryNames);

          set({ _repoNameCommitTreeMap: repoNameCommitTreeMap});
      
      } catch (error) {
        get().resetRepoNameCommitTreeMap();
        console.error(`Failed to build RepoNameCommitTreeMap, reason: ${error}`);
        return false;
      }

      return true;
    },

    // CC-TODO: das NEW aus dem Namen entfernen, wenn fertig
    fetchAndStoreEvolutuinDataForSelectedCommitsNEW: async (
      repositoryName: string,
      selectedCommits: SelectedCommit[]
    ): Promise<void> => {
        const newRepoNameToFlatLandscapeMap = get()._repoNameToFlatLandscapeMap;
        try {
          const structureLandscapeData = await useEvolutionDataFetchServiceStore.getState()
            .fetchFlatLandscapeForRepoNameAndCommits(repositoryName, selectedCommits);

          newRepoNameToFlatLandscapeMap.set(repositoryName, structureLandscapeData);
        } catch (error) {
          console.error(
            `Failed to fetch and set flat landscape data for repo: ${repositoryName}, reason: ${error}`
          );
        }
        set({ _repoNameToFlatLandscapeMap: newRepoNameToFlatLandscapeMap });
    },

    // CC-TODO: Wahrscheinlich ganz weg, wenn die andere geht
    // Gilt womöglich auch für alle enthaltenen
    fetchAndStoreEvolutionDataForSelectedCommits: async (
      appNameToSelectedCommits: Map<string, SelectedCommit[]>
    ): Promise<void> => {
      // initiate temp variables on which this function will work

      const newEvolutionStructureLandscapeData = new Map<
        string,
        StructureLandscapeData
      >();

      let newCombinedStructureLandscapeData =
        createEmptyStructureLandscapeData();

      const newCommitsToCommitComparisonMap = new Map<
        string,
        CommitComparison
      >();

      const newAppNameToCommitIdToApplicationMetricsCodeMap = new Map<
        string,
        Map<string, ApplicationMetricsCode>
      >();

      /**
       * CC-TODO: Schleife kann weg und durch den neuen, einen Endpoint ersetzt werden
       * Zusätzlich sollte es eine Map geben von RepoName -> FlatLandscape
       * Beim Call wird dann nur für den jeweiligen RepoNamen das FlatLandscape Objekt ersetzt
       * Beim Auswählen eines anderen Repos wird dann das jeweilig hinterlegte FlatLandscape Objekt (falls vorhanden)
       *  an den Rerender-Trigger übergeben
       */
      for (const [appName, selectedCommits] of appNameToSelectedCommits) {
        try {
          await get()._fetchMetricsForAppAndCommits(
            appName,
            selectedCommits,
            newAppNameToCommitIdToApplicationMetricsCodeMap
          );

          await get()._fetchCommitComparisonForAppAndCommits(
            appName,
            selectedCommits,
            newCommitsToCommitComparisonMap
          );

          // fetch single landscape structure for appName and commits
          const combinedLandscapeStructure =
            await useEvolutionDataFetchServiceStore
              .getState()
              .fetchStaticLandscapeStructuresForAppName(
                appName,
                selectedCommits
              );

          newEvolutionStructureLandscapeData.set(
            appName,
            combinedLandscapeStructure
          );

          // combine all fetched landscape structures, i.e., for each appName
          // in a single object
          newCombinedStructureLandscapeData = combineStructureLandscapeData(
            newCombinedStructureLandscapeData,
            combinedLandscapeStructure
          );
        } catch (error) {
          console.error(
            `Failed to fetch and set structure landscape data for app: ${appName}, reason: ${error}`
          );
        }
      }

      set({ _commitsToCommitComparisonMap: newCommitsToCommitComparisonMap });
      set({
        _evolutionStructureLandscapeData: newEvolutionStructureLandscapeData, // Not used???????????
      });
      set({
        _combinedStructureLandscapeData: newCombinedStructureLandscapeData,
      });
      set({
        _appNameToCommitIdToApplicationMetricsCodeMap:
          newAppNameToCommitIdToApplicationMetricsCodeMap,
      });
    },

    resetAllEvolutionData: (): void => {
      get().resetEvolutionStructureLandscapeData();
      get().resetRepoNameCommitTreeMap();
    },

    resetStructureLandscapeData: (): void => {
      get().resetAppNameToCommitIdToApplicationMetricsCodeMap();
      get().resetEvolutionStructureLandscapeData();
      get().resetCommitsToCommitComparisonMap();
    },

    resetAppNameToCommitIdToApplicationMetricsCodeMap: () => {
      set({ _appNameToCommitIdToApplicationMetricsCodeMap: new Map() });
    },

    resetEvolutionStructureLandscapeData: () => {
      set({ _evolutionStructureLandscapeData: new Map() });
      set({
        _combinedStructureLandscapeData: createEmptyStructureLandscapeData(),
      });
    },

    resetRepoNameCommitTreeMap: () => {
      set({ _repoNameCommitTreeMap: new Map() });
    },

    resetCommitsToCommitComparisonMap: () => {
      set({ _commitsToCommitComparisonMap: new Map() });
    },

    /**
     * CC-TODO: Kann im Backend komplett passieren
     *  
     * commitIdToApplicationMetricsCode: Brauchen wir nicht, 
     * der Store Eintrag wird einfach komplett überschrieben
     */ 
    _fetchMetricsForAppAndCommits: async (
      appName: string,
      selectedCommits: SelectedCommit[],
      newAppNameToCommitIdToApplicationMetricsCodeMap: Map<
        string,
        Map<string, ApplicationMetricsCode>
      >
    ) => {
      // Deep clone the existing map or initialize a new one if it doesn't exist
      let commitIdToApplicationMetricsCode =
        structuredClone(
          get()._appNameToCommitIdToApplicationMetricsCodeMap.get(appName)
        ) ?? new Map();

      // Create a set of selected commit IDs for quick look-up
      const selectedCommitIdsSet = new Set(
        selectedCommits.map((commit) => commit.commitId)
      );

      // Filter out old entries that are not in the selected commits
      commitIdToApplicationMetricsCode = new Map(
        [...commitIdToApplicationMetricsCode].filter(([commitId]) =>
          selectedCommitIdsSet.has(commitId)
        )
      );

      for (const selectedCommit of selectedCommits) {
        if (!commitIdToApplicationMetricsCode.has(selectedCommit.commitId)) {
          const commitIdToAppMetricsCode =
            await useEvolutionDataFetchServiceStore
              .getState()
              .fetchApplicationMetricsCodeForAppNameAndCommit(
                appName,
                selectedCommit
              );
          commitIdToApplicationMetricsCode.set(
            selectedCommit.commitId,
            commitIdToAppMetricsCode
          );
        }
        // else already fetched
      }

      // Store the result in the temporary map
      newAppNameToCommitIdToApplicationMetricsCodeMap.set(
        appName,
        commitIdToApplicationMetricsCode
      );
    },

    /**
     * CC-TODO: Kann komplett im Backend passieren
     *  Wird wahrscheinlich das finale Objekt sein...nicht ganz sicher
     * DOPPEL-TODO: Bestätigen, ob das so ist
     */
    _fetchCommitComparisonForAppAndCommits: async (
      appName: string,
      selectedCommits: SelectedCommit[],
      newCommitsToCommitComparisonMap: Map<string, CommitComparison>
    ): Promise<void> => {
      if (selectedCommits.length === 2) {
        const mapKey = `${selectedCommits[0].commitId}-${selectedCommits[1].commitId}`;
        const commitComparison =
          get()._commitsToCommitComparisonMap.get(mapKey) ??
          (await useEvolutionDataFetchServiceStore
            .getState()
            .fetchCommitComparison(
              appName,
              selectedCommits[0],
              selectedCommits[1]
            ));
        newCommitsToCommitComparisonMap.set(mapKey, commitComparison!);
      }
    },

    _buildRepoNameCommitTreeMap: async (
      repositoryNames: string[]
    ): Promise<RepoNameCommitTreeMap> => {
      const repoNameCommitTreeMap: RepoNameCommitTreeMap = new Map();

      for (const repoName of repositoryNames) {
        const commitTree = await get()._fetchCommitTreeForRepoName(repoName);
        if (commitTree) {
          repoNameCommitTreeMap.set(repoName, commitTree);
        }
      }
      return repoNameCommitTreeMap;
    },

    _fetchCommitTreeForRepoName: async (
      repoName: string
    ): Promise<CommitTree | undefined> => {
      try {
        return await useEvolutionDataFetchServiceStore
          .getState()
          .fetchCommitTreeForRepoName(repoName);
      } catch (reason) {
        console.error(
          `Failed to fetch Commit Tree for repoName: ${repoName}, reason: ${reason}`
        );
        return undefined;
      }
    },

    getMetricForBuilding: (
      building: Building | undefined,
      metricKey: string
    ) => {
      if (!building) return 0;
      if (metricKey === SelectedBuildingMetric.None) return 0;
      if (metricKey === SelectedBuildingMetric.Method)
        return building.functionIds?.length || 0;

      // CC-TODO: Add further metrics
      return 0;
    },
  }));
