import Service, { inject as service } from '@ember/service';
import debugLogger from 'ember-debug-logger';
// import { tracked } from '@glimmer/tracking';
import {
  CommitTree,
  AppNameCommitTreeMap,
  CommitComparison,
} from 'react-lib/src/utils/evolution-schemes/evolution-data';
import { StructureLandscapeData } from 'react-lib/src/utils/landscape-schemes/structure-data';
import {
  combineStructureLandscapeData,
  createEmptyStructureLandscapeData,
} from 'react-lib/src/utils/landscape-structure-helpers';
import { ApplicationMetricsCode } from 'react-lib/src/utils/metric-schemes/metric-data';
// import EvolutionDataFetchServiceService from '../evolution-data-fetch-service';
import { useEvolutionDataFetchServiceStore } from 'react-lib/src/stores/evolution-data-fetch-service';
import {
  SelectedCommit,
  useCommitTreeStateStore,
} from 'react-lib/src/stores/commit-tree-state';
import { useEvolutionDataRepositoryStore } from 'react-lib/src/stores/repos/evolution-data-repository';

export default class EvolutionDataRepository extends Service {
  private readonly debug = debugLogger('EvolutionDataRepository');

  // #region Services

  // @service('evolution-data-fetch-service')
  // evolutionDataFetchService!: EvolutionDataFetchServiceService;

  // @service('commit-tree-state')
  // commitTreeStateService!: CommitTreeStateService;

  // #endregion

  // #region Properties

  // @tracked
  // private _appNameCommitTreeMap: AppNameCommitTreeMap = new Map();
  get _appNameCommitTreeMap(): AppNameCommitTreeMap {
    return useEvolutionDataRepositoryStore.getState()._appNameCommitTreeMap;
  }

  set _appNameCommitTreeMap(value: AppNameCommitTreeMap) {
    useEvolutionDataRepositoryStore.setState({ _appNameCommitTreeMap: value });
  }

  // private _evolutionStructureLandscapeData: Map<
  //   string,
  //   StructureLandscapeData
  // > = new Map();
  // <appName, StructureLandscapeData>
  get _evolutionStructureLandscapeData(): Map<string, StructureLandscapeData> {
    return useEvolutionDataRepositoryStore.getState()
      ._evolutionStructureLandscapeData;
  }

  set _evolutionStructureLandscapeData(
    value: Map<string, StructureLandscapeData>
  ) {
    useEvolutionDataRepositoryStore.setState({
      _evolutionStructureLandscapeData: value,
    });
  }

  // private _combinedStructureLandscapeData: StructureLandscapeData =
  //   createEmptyStructureLandscapeData();
  get _combinedStructureLandscapeData(): StructureLandscapeData {
    return useEvolutionDataRepositoryStore.getState()
      ._combinedStructureLandscapeData;
  }

  set _combinedStructureLandscapeData(value: StructureLandscapeData) {
    useEvolutionDataRepositoryStore.setState({
      _combinedStructureLandscapeData: value,
    });
  }

  // private _appNameToCommitIdToApplicationMetricsCodeMap: Map<
  //   string,
  //   Map<string, ApplicationMetricsCode>
  // > = new Map();
  get _appNameToCommitIdToApplicationMetricsCodeMap(): Map<
    string,
    Map<string, ApplicationMetricsCode>
  > {
    return useEvolutionDataRepositoryStore.getState()
      ._appNameToCommitIdToApplicationMetricsCodeMap;
  }

  set _appNameToCommitIdToApplicationMetricsCodeMap(
    value: Map<string, Map<string, ApplicationMetricsCode>>
  ) {
    useEvolutionDataRepositoryStore.setState({
      _appNameToCommitIdToApplicationMetricsCodeMap: value,
    });
  }

  // private _commitsToCommitComparisonMap: Map<string, CommitComparison> =
  //   new Map();
  get _commitsToCommitComparisonMap(): Map<string, CommitComparison> {
    return useEvolutionDataRepositoryStore.getState()
      ._commitsToCommitComparisonMap;
  }

  set _commitsToCommitComparisonMap(value: Map<string, CommitComparison>) {
    useEvolutionDataRepositoryStore.setState({
      _commitsToCommitComparisonMap: value,
    });
  }

  // #endregion

  // #region Getter / Setter
  //

  get evolutionStructureLandscapeData(): Map<string, StructureLandscapeData> {
    return useEvolutionDataRepositoryStore.getState()
      ._evolutionStructureLandscapeData;
  }

  get appNameCommitTreeMap(): AppNameCommitTreeMap {
    return useEvolutionDataRepositoryStore.getState()._appNameCommitTreeMap;
  }

  get combinedStructureLandscapeData(): StructureLandscapeData {
    return useEvolutionDataRepositoryStore.getState()
      ._combinedStructureLandscapeData;
  }

  get commitsToCommitComparisonMap(): Map<string, CommitComparison> {
    return useEvolutionDataRepositoryStore.getState()
      ._commitsToCommitComparisonMap;
  }

  get appNameToCommitIdToApplicationMetricsCodeMap(): Map<
    string,
    Map<string, ApplicationMetricsCode>
  > {
    return useEvolutionDataRepositoryStore.getState()
      ._appNameToCommitIdToApplicationMetricsCodeMap;
  }

  getCommitComparisonByAppName(appName: string): CommitComparison | undefined {
    const selectedCommits =
      useCommitTreeStateStore.getState().getSelectedCommits().get(appName) ??
      [];

    if (selectedCommits.length !== 2) {
      return undefined;
    }

    const [firstCommit, secondCommit] = selectedCommits;
    const mapKey = `${firstCommit.commitId}-${secondCommit.commitId}`;

    return this.commitsToCommitComparisonMap.get(mapKey);
  }

  // #endregion

  // #region Fetch functions

  async fetchAndStoreApplicationCommitTrees(): Promise<void> {
    this.debug('fetchAndStoreApplicationCommitTrees');

    try {
      const applicationNames =
        await useEvolutionDataFetchServiceStore.getState().fetchApplications();
        // await this.evolutionDataFetchService.fetchApplications();
      const appNameCommitTreeMap =
        await this.buildAppNameCommitTreeMap(applicationNames);

      this._appNameCommitTreeMap = appNameCommitTreeMap;
    } catch (error) {
      useEvolutionDataRepositoryStore.getState().resetAppNameCommitTreeMap();
      console.error(`Failed to build AppNameCommitTreeMap, reason: ${error}`);
    }
  }

  async fetchAndStoreEvolutionDataForSelectedCommits(
    appNameToSelectedCommits: Map<string, SelectedCommit[]>
  ): Promise<void> {
    // initiate temp variables on which this function will work

    const newEvolutionStructureLandscapeData = new Map<
      string,
      StructureLandscapeData
    >();

    let newCombinedStructureLandscapeData = createEmptyStructureLandscapeData();

    const newCommitsToCommitComparisonMap = new Map<string, CommitComparison>();

    const newAppNameToCommitIdToApplicationMetricsCodeMap = new Map<
      string,
      Map<string, ApplicationMetricsCode>
    >();

    for (const [appName, selectedCommits] of appNameToSelectedCommits) {
      try {
        await this.fetchMetricsForAppAndCommits(
          appName,
          selectedCommits,
          newAppNameToCommitIdToApplicationMetricsCodeMap
        );

        await this.fetchCommitComparisonForAppAndCommits(
          appName,
          selectedCommits,
          newCommitsToCommitComparisonMap
        );

        // fetch single landscape structure for appName and commits
        const combinedLandscapeStructure =
          await useEvolutionDataFetchServiceStore.getState().fetchStaticLandscapeStructuresForAppName(
            appName,
            selectedCommits
          );
        // await this.evolutionDataFetchService.fetchStaticLandscapeStructuresForAppName(
          //   appName,
          //   selectedCommits
          // );

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

    this._commitsToCommitComparisonMap = newCommitsToCommitComparisonMap;
    this._evolutionStructureLandscapeData = newEvolutionStructureLandscapeData;
    this._combinedStructureLandscapeData = newCombinedStructureLandscapeData;
    this._appNameToCommitIdToApplicationMetricsCodeMap =
      newAppNameToCommitIdToApplicationMetricsCodeMap;
  }

  // #endregion

  // #region Reset functions

  // resetAllEvolutionData(): void {
  //   this.resetEvolutionStructureLandscapeData();
  //   this.resetAppNameCommitTreeMap();
  // }
  resetAllEvolutionData(): void {
    this.debug('Reset All Evolution Data');
    useEvolutionDataRepositoryStore
      .getState()
      .resetEvolutionStructureLandscapeData();
    useEvolutionDataRepositoryStore.getState().resetAppNameCommitTreeMap();
  }

  // resetStructureLandscapeData(): void {
  //   this.debug('Reset Evolution StructureLandscapeData');
  //   this.resetAppNameToCommitIdToApplicationMetricsCodeMap();
  //   this.resetEvolutionStructureLandscapeData();
  //   this._commitsToCommitComparisonMap = new Map();
  // }
  resetStructureLandscapeData(): void {
    this.debug('Reset Evolution StructureLandscapeData');
    useEvolutionDataRepositoryStore
      .getState()
      .resetAppNameToCommitIdToApplicationMetricsCodeMap();
    useEvolutionDataRepositoryStore
      .getState()
      .resetEvolutionStructureLandscapeData();
    useEvolutionDataRepositoryStore
      .getState()
      .resetCommitsToCommitComparisonMap();
  }

  // resetAppNameToCommitIdToApplicationMetricsCodeMap(): void {
  //   this._appNameToCommitIdToApplicationMetricsCodeMap = new Map();
  // }

  // resetEvolutionStructureLandscapeData(): void {
  //   this._evolutionStructureLandscapeData = new Map();
  //   this._combinedStructureLandscapeData = createEmptyStructureLandscapeData();
  // }

  // resetAppNameCommitTreeMap(): void {
  //   this._appNameCommitTreeMap = new Map();
  // }

  // #endregion

  // #region Private Helper Functions

  private async fetchMetricsForAppAndCommits(
    appName: string,
    selectedCommits: SelectedCommit[],
    newAppNameToCommitIdToApplicationMetricsCodeMap: Map<
      string,
      Map<string, ApplicationMetricsCode>
    >
  ) {
    // Deep clone the existing map or initialize a new one if it doesn't exist
    let commitIdToApplicationMetricsCode =
      structuredClone(
        this.appNameToCommitIdToApplicationMetricsCodeMap.get(appName)
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
          await useEvolutionDataFetchServiceStore.getState().fetchApplicationMetricsCodeForAppNameAndCommit(
            appName,
            selectedCommit
          );
        // await this.evolutionDataFetchService.fetchApplicationMetricsCodeForAppNameAndCommit(
          //   appName,
          //   selectedCommit
          // );
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
  }

  private async fetchCommitComparisonForAppAndCommits(
    appName: string,
    selectedCommits: SelectedCommit[],
    newCommitsToCommitComparisonMap: Map<string, CommitComparison>
  ): Promise<void> {
    if (selectedCommits.length === 2) {
      const mapKey = `${selectedCommits[0].commitId}-${selectedCommits[1].commitId}`;
      const commitComparison =
        this.commitsToCommitComparisonMap.get(mapKey) ??
        (
          await useEvolutionDataFetchServiceStore.getState().fetchCommitComparison(
            appName,
            selectedCommits[0],
            selectedCommits[1]
          )
        );
      // (
      //     await this.evolutionDataFetchService.fetchCommitComparison(
      //     appName,
      //     selectedCommits[0],
      //     selectedCommits[1]
      //   )
      // );
      newCommitsToCommitComparisonMap.set(mapKey, commitComparison!);
    }
  }

  private async buildAppNameCommitTreeMap(
    applicationNames: string[]
  ): Promise<AppNameCommitTreeMap> {
    const appNameCommitTreeMap: AppNameCommitTreeMap = new Map();

    for (const appName of applicationNames) {
      const commitTree = await this.fetchCommitTreeForAppName(appName);
      if (commitTree) {
        appNameCommitTreeMap.set(appName, commitTree);
      }
    }
    return appNameCommitTreeMap;
  }

  private async fetchCommitTreeForAppName(
    appName: string
  ): Promise<CommitTree | undefined> {
    try {
      return await useEvolutionDataFetchServiceStore.getState().fetchCommitTreeForAppName(
        appName
      );
      // this.evolutionDataFetchService.fetchCommitTreeForAppName(
      //   appName
      // );
    } catch (reason) {
      console.error(
        `Failed to fetch Commit Tree for appName: ${appName}, reason: ${reason}`
      );
      return undefined;
    }
  }

  // #endregion
}

declare module '@ember/service' {
  interface Registry {
    'evolution-data-repository': EvolutionDataRepository;
  }
}
