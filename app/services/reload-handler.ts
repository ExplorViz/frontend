import Service, { inject as service } from '@ember/service';
import Evented from '@ember/object/evented';

import debugLogger from 'ember-debug-logger';
import { DynamicLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/dynamic/dynamic-data';
import {
  preProcessAndEnhanceStructureLandscape,
  StructureLandscapeData,
} from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import LandscapeListener from './landscape-listener';
import { SelectedCommit } from 'explorviz-frontend/controllers/visualization';

export default class ReloadHandler extends Service.extend(Evented) {
  @service('landscape-listener') landscapeListener!: LandscapeListener;

  debug = debugLogger();

  /**
   * Loads a landscape from the backend and triggers a visualization update
   * @method loadLandscapeById
   * @param {*} timestamp
   */
  async loadLandscapeByTimestamp(selectedCommit: SelectedCommit, timestamp: number, interval: number = 10) {
    const self = this;
    console.log("LOAD LANDSCAPE BY TIMESTAMP FOR COMMIT ", selectedCommit, " and timestamp ", timestamp);
    self.debug('Start import landscape-request');

    try {
      const [structureDataPromise, dynamicDataPromise] =
        await this.landscapeListener.requestData(timestamp, interval); // TODO: also request by commit id

      if (
        structureDataPromise.status === 'fulfilled' &&
        dynamicDataPromise.status === 'fulfilled'
      ) {
        const structure = preProcessAndEnhanceStructureLandscape(
          structureDataPromise.value
        );

        return [structure, dynamicDataPromise.value] as [
          StructureLandscapeData,
          DynamicLandscapeData,
        ];
      }
      throw Error('No data available.');
    } catch (e) {
      throw Error(e);
    }
  }
}

declare module '@ember/service' {
  interface Registry {
    'reload-handler': ReloadHandler;
  }
}
