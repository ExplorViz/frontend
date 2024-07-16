import Service, { inject as service } from '@ember/service';
import debugLogger from 'ember-debug-logger';
import {
  EvolutedApplication,
  EvolutionLandscapeData,
} from 'explorviz-frontend/utils/evolution-schemes/evolution-data';
import { StructureLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import { createEmptyStructureLandscapeData } from 'explorviz-frontend/utils/landscape-structure-helpers';
import EvolutionDataFetchServiceService from '../evolution-data-fetch-service';
import { tracked } from '@glimmer/tracking';

export default class EvolutionDataRepository extends Service {
  private readonly debug = debugLogger('EvolutionData');

  // #region Services

  @service('evolution-data-fetch-service')
  evolutionDataFetchService!: EvolutionDataFetchServiceService;

  // #endregion

  // #region Properties and getter

  private _evolutionStructureLandscapeData: StructureLandscapeData =
    createEmptyStructureLandscapeData();

  get evolutionStructureLandscapeData() {
    return this._evolutionStructureLandscapeData;
  }

  @tracked
  private _evolutionLandscapeData: EvolutionLandscapeData = new Map();

  get evolutionLandscapeData() {
    return this._evolutionLandscapeData;
  }

  // #endregion

  // #region Fetch functions
  async fetchAllApplications() {
    this.debug('fetchAllApplications');
    try {
      const applicationNames: string[] =
        await this.evolutionDataFetchService.fetchApplications();
      const evolutionLandscapeData: EvolutionLandscapeData = new Map();

      for (const appName of applicationNames) {
        // fetch commit tree for each found appName
        const commitTreeForAppName =
          await this.fetchCommitTreeForAppName(appName);

        if (commitTreeForAppName) {
          evolutionLandscapeData.set(appName, commitTreeForAppName);
        }
      }

      this._evolutionLandscapeData = evolutionLandscapeData;
    } catch (reason) {
      this.resetEvolutionLandscapeData();
      console.error(
        `Failed to fetch EvolutionLandscapeData, reason: ${reason}`
      );
    }
  }
  // #endregion

  // #region Reset functions
  resetEvolutionStructureLandscapeData() {
    this._evolutionStructureLandscapeData = createEmptyStructureLandscapeData();
  }

  resetEvolutionLandscapeData() {
    this._evolutionLandscapeData = new Map();
  }
  // #endregion

  //#region Private Helper Functions

  private async fetchCommitTreeForAppName(
    appName: string
  ): Promise<EvolutedApplication | undefined> {
    try {
      const evolutionApplication: EvolutedApplication =
        await this.evolutionDataFetchService.fetchCommitTreeForAppName(appName);
      return evolutionApplication;
    } catch (reason) {
      console.error(
        `Failed to fetch Commit Tree for appName: ${appName}, reason: ${reason}`
      );
      return undefined;
    }
  }
}

declare module '@ember/service' {
  interface Registry {
    'repos/evolution-data-repository.ts': EvolutionDataRepository;
  }
}
