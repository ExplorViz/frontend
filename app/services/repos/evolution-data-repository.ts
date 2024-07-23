import Service, { inject as service } from '@ember/service';
import debugLogger from 'ember-debug-logger';
import {
  CommitTree,
  AppNameCommitTreeMap,
} from 'explorviz-frontend/utils/evolution-schemes/evolution-data';
import { StructureLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import EvolutionDataFetchServiceService from '../evolution-data-fetch-service';
import { tracked } from '@glimmer/tracking';
import { SelectedCommit } from 'explorviz-frontend/utils/commit-tree/commit-tree-handler';
import {
  combineStructureLandscapeData,
  createEmptyStructureLandscapeData,
} from 'explorviz-frontend/utils/landscape-structure-helpers';

export default class EvolutionDataRepository extends Service {
  private readonly debug = debugLogger('EvolutionData');

  // #region Services

  @service('evolution-data-fetch-service')
  evolutionDataFetchService!: EvolutionDataFetchServiceService;

  // #endregion

  // #region Properties and getter

  private _evolutionStructureLandscapeData: Map<
    string,
    StructureLandscapeData
  > = new Map();
  // <appName, StructureLandscapeData>

  get evolutionStructureLandscapeData() {
    return this._evolutionStructureLandscapeData;
  }

  @tracked
  private _appNameCommitTreeMap: AppNameCommitTreeMap = new Map();

  get appNameCommitTreeMap() {
    return this._appNameCommitTreeMap;
  }

  @tracked
  combinedStructureLandscapes: StructureLandscapeData =
    createEmptyStructureLandscapeData();

  // #endregion

  // #region Fetch functions
  async fetchAllApplications() {
    this.debug('fetchAllApplications');
    try {
      const applicationNames: string[] =
        await this.evolutionDataFetchService.fetchApplications();
      const appNameCommitTreeMap: AppNameCommitTreeMap = new Map();

      for (const appName of applicationNames) {
        // fetch commit tree for each found appName
        const commitTreeForAppName =
          await this.fetchCommitTreeForAppName(appName);

        if (commitTreeForAppName) {
          appNameCommitTreeMap.set(appName, commitTreeForAppName);
        }
      }

      this._appNameCommitTreeMap = appNameCommitTreeMap;
    } catch (reason) {
      this.resetAppNameCommitTreeMap();
      console.error(`Failed to build AppNameCommitTreeMap, reason: ${reason}`);
    }
  }

  async fetchAndSetAllStructureLandscapeDataForSelectedCommits(
    appNameToSelectedCommits: Map<string, SelectedCommit[]>
  ) {
    const newEvolutionStructureLandscapeData: Map<
      string,
      StructureLandscapeData
    > = new Map();

    let allCombinedStructureLandscapes: StructureLandscapeData =
      createEmptyStructureLandscapeData();

    for (const [appName, selectedCommits] of appNameToSelectedCommits) {
      const combinedLandscapeStructureForAppAndCommits =
        await this.evolutionDataFetchService.fetchStaticLandscapeStructuresForAppName(
          appName,
          selectedCommits
        );

      newEvolutionStructureLandscapeData.set(
        appName,
        combinedLandscapeStructureForAppAndCommits
      );

      allCombinedStructureLandscapes = combineStructureLandscapeData(
        allCombinedStructureLandscapes,
        combinedLandscapeStructureForAppAndCommits
      );
    }

    this._evolutionStructureLandscapeData = newEvolutionStructureLandscapeData;
    this.combinedStructureLandscapes = allCombinedStructureLandscapes;
  }
  // #endregion

  // #region Reset functions

  resetStructureLandscapeData() {
    this.debug('Reset Evolution StructureLandscapeData');
    this.resetEvolutionStructureLandscapeData();
  }

  resetAllEvolutionData() {
    this.debug('Reset All Evolution Data');
    this.resetEvolutionStructureLandscapeData();
    this.resetAppNameCommitTreeMap();
  }

  resetEvolutionStructureLandscapeData() {
    this._evolutionStructureLandscapeData = new Map();
    this.combinedStructureLandscapes = createEmptyStructureLandscapeData();
  }

  resetAppNameCommitTreeMap() {
    this._appNameCommitTreeMap = new Map();
  }
  // #endregion

  //#region Private Helper Functions

  private async fetchCommitTreeForAppName(
    appName: string
  ): Promise<CommitTree | undefined> {
    try {
      const evolutionApplication: CommitTree =
        await this.evolutionDataFetchService.fetchCommitTreeForAppName(appName);
      return evolutionApplication;
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
    'repos/evolution-data-repository.ts': EvolutionDataRepository;
  }
}
