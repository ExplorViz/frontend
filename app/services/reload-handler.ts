import Service, { inject as service } from '@ember/service';
import Evented from '@ember/object/evented';

import debugLogger from 'ember-debug-logger';
import { DynamicLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/dynamic-data';
import { preProcessAndEnhanceStructureLandscape, StructureLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import LandscapeListener from './landscape-listener';

export default class ReloadHandler extends Service.extend(Evented) {
  @service('landscape-listener') landscapeListener!: LandscapeListener;

  debug = debugLogger();

  /**
   * Loads a landscape from the backend and triggers a visualization update
   * @method loadLandscapeById
   * @param {*} timestamp
   */
  async loadLandscapeByTimestamp(timestamp: number, interval: number = 10) {
    const self = this;

    self.debug('Start import landscape-request');

    try {
      const [structureDataPromise, dynamicDataPromise] = await
      this.landscapeListener.requestData(timestamp, interval);

      if (structureDataPromise.status === 'fulfilled' && dynamicDataPromise.status === 'fulfilled') {
        const structure = preProcessAndEnhanceStructureLandscape(structureDataPromise.value);

        return [structure, dynamicDataPromise.value] as
        [StructureLandscapeData, DynamicLandscapeData];
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
