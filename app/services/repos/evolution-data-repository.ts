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
import { action } from '@ember/object';
import RenderingService from '../rendering-service';
import {
  combineStructureLandscapeData,
  createEmptyStructureLandscapeData,
} from 'explorviz-frontend/utils/landscape-structure-helpers';
import TimestampRepository from './timestamp-repository';

export default class EvolutionDataRepository extends Service {
  private readonly debug = debugLogger('EvolutionData');

  // #region Services

  @service('evolution-data-fetch-service')
  evolutionDataFetchService!: EvolutionDataFetchServiceService;

  @service('rendering-service')
  renderingService!: RenderingService;

  @service('repos/timestamp-repository')
  timestampRepo!: TimestampRepository;

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

  @action
  async fetchAndUpdateAllStructureLandscapeDataForSelectedCommits(
    appNameToSelectedCommits: Map<string, SelectedCommit[]>
  ) {
    this.timestampRepo.stopTimestampPollingAndVizUpdate();

    if (appNameToSelectedCommits.size > 0) {
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

      this._evolutionStructureLandscapeData =
        newEvolutionStructureLandscapeData;

      this.combinedStructureLandscapes = allCombinedStructureLandscapes;

      // always resume when commit got clicked so the landscape updates
      if (this.renderingService.visualizationPaused) {
        this.renderingService.resumeVisualizationUpdating();
      }

      if (allCombinedStructureLandscapes.nodes.length > 0) {
        this.renderingService.triggerRenderingForGivenLandscapeData(
          allCombinedStructureLandscapes,
          []
        );
      }

      this.timestampRepo.resetState();

      // TODO init timestampolling
    } else {
      // no more selected commits, go back to visualize cross-commit runtime behavior

      // reset state

      //this.resetAllEvolutionData();
      this.timestampRepo.resetState();
      this.timestampRepo.restartTimestampPollingAndVizUpdate([]);
    }
  }
  // #endregion

  // #region Reset functions

  resetAllEvolutionData() {
    this.resetEvolutionStructureLandscapeData();
    this.resetAppNameCommitTreeMap();
  }

  resetEvolutionStructureLandscapeData() {
    this._evolutionStructureLandscapeData = new Map();
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
