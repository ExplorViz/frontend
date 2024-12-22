import Service, { inject as service } from '@ember/service';
import debugLogger from 'ember-debug-logger';
import { tracked } from '@glimmer/tracking';
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
import EvolutionDataFetchServiceService from '../evolution-data-fetch-service';
import CommitTreeStateService, { SelectedCommit } from '../commit-tree-state';

export default class EvolutionDataRepository extends Service {
  private readonly debug = debugLogger('EvolutionDataRepository');

  // #region Services

  @service('evolution-data-fetch-service')
  evolutionDataFetchService!: EvolutionDataFetchServiceService;

  @service('commit-tree-state')
  commitTreeStateService!: CommitTreeStateService;

  // #endregion

  // #region Properties

  @tracked private _appNameCommitTreeMap: AppNameCommitTreeMap = new Map();

  private _evolutionStructureLandscapeData: Map<
    string,
    StructureLandscapeData
  > = new Map();
  // <appName, StructureLandscapeData>

  private _combinedStructureLandscapeData: StructureLandscapeData =
    createEmptyStructureLandscapeData();

  private _appNameToCommitIdToApplicationMetricsCodeMap: Map<
    string,
    Map<string, ApplicationMetricsCode>
  > = new Map();

  private _commitsToCommitComparisonMap: Map<string, CommitComparison> =
    new Map();

  // #endregion

  // #region Getter / Setter

  get evolutionStructureLandscapeData(): Map<string, StructureLandscapeData> {
    return this._evolutionStructureLandscapeData;
  }

  get appNameCommitTreeMap(): AppNameCommitTreeMap {
    return this._appNameCommitTreeMap;
  }

  get combinedStructureLandscapeData(): StructureLandscapeData {
    return this._combinedStructureLandscapeData;
  }

  get commitsToCommitComparisonMap(): Map<string, CommitComparison> {
    return this._commitsToCommitComparisonMap;
  }

  get appNameToCommitIdToApplicationMetricsCodeMap(): Map<
    string,
    Map<string, ApplicationMetricsCode>
  > {
    return this._appNameToCommitIdToApplicationMetricsCodeMap;
  }

  getCommitComparisonByAppName(appName: string): CommitComparison | undefined {
    const selectedCommits =
      this.commitTreeStateService.selectedCommits.get(appName) ?? [];

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
        await this.evolutionDataFetchService.fetchApplications();
      const appNameCommitTreeMap =
        await this.buildAppNameCommitTreeMap(applicationNames);

      this._appNameCommitTreeMap = appNameCommitTreeMap;
    } catch (error) {
      this.resetAppNameCommitTreeMap();
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
          await this.evolutionDataFetchService.fetchStaticLandscapeStructuresForAppName(
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

    this._commitsToCommitComparisonMap = newCommitsToCommitComparisonMap;
    this._evolutionStructureLandscapeData = newEvolutionStructureLandscapeData;
    this._combinedStructureLandscapeData = newCombinedStructureLandscapeData;
    this._appNameToCommitIdToApplicationMetricsCodeMap =
      newAppNameToCommitIdToApplicationMetricsCodeMap;
  }

  // #endregion

  // #region Reset functions

  resetAllEvolutionData(): void {
    this.debug('Reset All Evolution Data');
    this.resetEvolutionStructureLandscapeData();
    this.resetAppNameCommitTreeMap();
  }

  resetStructureLandscapeData(): void {
    this.debug('Reset Evolution StructureLandscapeData');
    this.resetAppNameToCommitIdToApplicationMetricsCodeMap();
    this.resetEvolutionStructureLandscapeData();
    this._commitsToCommitComparisonMap = new Map();
  }

  resetAppNameToCommitIdToApplicationMetricsCodeMap(): void {
    this._appNameToCommitIdToApplicationMetricsCodeMap = new Map();
  }

  resetEvolutionStructureLandscapeData(): void {
    this._evolutionStructureLandscapeData = new Map();
    this._combinedStructureLandscapeData = createEmptyStructureLandscapeData();
  }

  resetAppNameCommitTreeMap(): void {
    this._appNameCommitTreeMap = new Map();
  }

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
          await this.evolutionDataFetchService.fetchApplicationMetricsCodeForAppNameAndCommit(
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
        (await this.evolutionDataFetchService.fetchCommitComparison(
          appName,
          selectedCommits[0],
          selectedCommits[1]
        ));
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
      return await this.evolutionDataFetchService.fetchCommitTreeForAppName(
        appName
      );
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
