import Service, { inject as service } from '@ember/service';
import debugLogger from 'ember-debug-logger';
import {
  EvolutedApplication,
  EvolutionLandscapeData,
} from 'explorviz-frontend/utils/evolution-schemes/evolution-data';
import { StructureLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import { createEmptyStructureLandscapeData } from 'explorviz-frontend/utils/landscape-structure-helpers';
import EvolutionDataFetchServiceService from '../evolution-data-fetch-service';
import ToastHandlerService from '../toast-handler';
import { tracked } from '@glimmer/tracking';

export default class EvolutionDataRepository extends Service {
  private readonly debug = debugLogger('EvolutionData');

  // #region Services

  @service('evolution-data-fetch-service')
  evolutionDataFetchService!: EvolutionDataFetchServiceService;

  @service('toast-handler')
  toastHandlerService!: ToastHandlerService;

  // #endregion

  // #region Properties and getter

  private _evolutionStructureLandscapeData: StructureLandscapeData =
    createEmptyStructureLandscapeData();

  get evolutionStructureLandscapeData() {
    return this._evolutionStructureLandscapeData;
  }

  @tracked
  private _evolutionLandscapeData: EvolutionLandscapeData = {
    applications: [],
  };

  get evolutionLandscapeData() {
    return this._evolutionLandscapeData;
  }

  // #endregion

  // #region Fetch functions
  fetchAllApplications() {
    this.debug('fetchAllApplications');
    this.evolutionDataFetchService
      .fetchApplications()
      .then((applicationNames: string[]) => {
        const evolutionLandscapeData: EvolutionLandscapeData = {
          applications: [],
        };

        applicationNames.forEach((appName) => {
          const evolutedApplication: EvolutedApplication = {
            name: appName,
            branches: [],
          };

          evolutionLandscapeData.applications = [
            ...evolutionLandscapeData.applications,
            evolutedApplication,
          ];
        });

        this._evolutionLandscapeData = evolutionLandscapeData;
      })
      .catch((reason) => {
        this.resetEvolutionLandscapeData();
        this.toastHandlerService.showErrorToastMessage(
          'Failed to fetch EvolutionLandscapeData, reason: ' + reason
        );
      });
  }
  // #endregion

  // #region Reset functions
  resetEvolutionStructureLandscapeData() {
    this._evolutionStructureLandscapeData = createEmptyStructureLandscapeData();
  }

  resetEvolutionLandscapeData() {
    this._evolutionLandscapeData = { applications: [] };
  }
  // #endregion
}

declare module '@ember/service' {
  interface Registry {
    'repos/evolution-data-repository.ts': EvolutionDataRepository;
  }
}
