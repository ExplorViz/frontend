import { createStore } from 'zustand/vanilla';
import {
  CommitTree,
  AppNameCommitTreeMap,
  CommitComparison,
} from 'react-lib/src/utils/evolution-schemes/evolution-data';
import { StructureLandscapeData } from '../../utils/landscape-schemes/structure-data';
import {
  combineStructureLandscapeData,
  createEmptyStructureLandscapeData,
} from 'react-lib/src/utils/landscape-structure-helpers';
import {
  ApplicationMetrics,
  ApplicationMetricsCode,
} from '../../utils/metric-schemes/metric-data';
import {
  SelectedCommit,
  useCommitTreeStateStore,
} from 'react-lib/src/stores/commit-tree-state';
import { useEvolutionDataFetchServiceStore } from 'react-lib/src/stores/evolution-data-fetch-service';

interface EvolutionDataRepositoryState {
  _appNameCommitTreeMap: AppNameCommitTreeMap;
  _evolutionStructureLandscapeData: Map<string, StructureLandscapeData>;
  _combinedStructureLandscapeData: StructureLandscapeData;
  _appNameToCommitIdToApplicationMetricsCodeMap: Map<
    string,
    Map<string, ApplicationMetricsCode>
  >;
  _commitsToCommitComparisonMap: Map<string, CommitComparison>;
  getCommitComparisonByAppName: (
    appName: string
  ) => CommitComparison | undefined;
  fetchAndStoreApplicationCommitTrees: () => Promise<void>;
  fetchAndStoreEvolutionDataForSelectedCommits: (
    appNameToSelectedCommits: Map<string, SelectedCommit[]>
  ) => Promise<void>;
  resetAllEvolutionData: () => void;
  resetStructureLandscapeData: () => void;
  resetAppNameToCommitIdToApplicationMetricsCodeMap: () => void;
  resetEvolutionStructureLandscapeData: () => void;
  resetAppNameCommitTreeMap: () => void;
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
  _buildAppNameCommitTreeMap: (
    applicationNames: string[]
  ) => Promise<AppNameCommitTreeMap>;
  _fetchCommitTreeForAppName: (
    appName: string
  ) => Promise<CommitTree | undefined>;
}

export const useEvolutionDataRepositoryState =
  createStore<EvolutionDataRepositoryState>((set, get) => ({
    _appNameCommitTreeMap: new Map<string, CommitTree>(), // tracked
    _evolutionStructureLandscapeData: new Map<string, StructureLandscapeData>(),
    _combinedStructureLandscapeData: createEmptyStructureLandscapeData(),
    _appNameToCommitIdToApplicationMetricsCodeMap: new Map<
      string,
      Map<string, ApplicationMetricsCode>
    >(),
    _commitsToCommitComparisonMap: new Map<string, CommitComparison>(),

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

      return get()._commitsToCommitComparisonMap.get(mapKey);
    },

    fetchAndStoreApplicationCommitTrees: async (): Promise<void> => {
      try {
        const applicationNames = await useEvolutionDataFetchServiceStore
          .getState()
          .fetchApplications();
        const appNameCommitTreeMap =
          await get()._buildAppNameCommitTreeMap(applicationNames);

        set({ _appNameCommitTreeMap: appNameCommitTreeMap });
      } catch (error) {
        get().resetAppNameCommitTreeMap();
        console.error(`Failed to build AppNameCommitTreeMap, reason: ${error}`);
      }
    },

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
        _evolutionStructureLandscapeData: newEvolutionStructureLandscapeData,
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
      get().resetAppNameCommitTreeMap();
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

    resetAppNameCommitTreeMap: () => {
      set({ _appNameCommitTreeMap: new Map() });
    },

    resetCommitsToCommitComparisonMap: () => {
      set({ _commitsToCommitComparisonMap: new Map() });
    },

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

    _buildAppNameCommitTreeMap: async (
      applicationNames: string[]
    ): Promise<AppNameCommitTreeMap> => {
      const appNameCommitTreeMap: AppNameCommitTreeMap = new Map();

      for (const appName of applicationNames) {
        const commitTree = await get()._fetchCommitTreeForAppName(appName);
        if (commitTree) {
          appNameCommitTreeMap.set(appName, commitTree);
        }
      }
      return appNameCommitTreeMap;
    },

    _fetchCommitTreeForAppName: async (
      appName: string
    ): Promise<CommitTree | undefined> => {
      try {
        return await useEvolutionDataFetchServiceStore
          .getState()
          ._fetchCommitTreeForAppName(appName);
      } catch (reason) {
        console.error(
          `Failed to fetch Commit Tree for appName: ${appName}, reason: ${reason}`
        );
        return undefined;
      }
    },
  }));
