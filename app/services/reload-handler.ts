import Service from '@ember/service';
import Evented from '@ember/object/evented';

import debugLogger from 'ember-debug-logger';
import { DynamicLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/dynamic/dynamic-data';
import {
  preProcessAndEnhanceStructureLandscape,
  StructureLandscapeData,
} from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import LandscapeListener from './landscape-listener';
import { SelectedCommit } from 'explorviz-frontend/controllers/visualization';
import LandscapeHttpRequestUtil from './landscape-http-request-util';
import { getOwner } from '@ember/application';

export default class ReloadHandler extends Service.extend(Evented) {
  landscapeHttpRequestUtil: LandscapeHttpRequestUtil =
    new LandscapeHttpRequestUtil(getOwner(this));

  debug = debugLogger();

  /**
   * Loads a landscape from the backend and triggers a visualization update
   * @method loadLandscapeById
   * @param {*} timestamp
   */
  async loadLandscapeByTimestamp(selectedCommit: SelectedCommit | undefined, timestamp: number, interval: number = 10) {
    const self = this;
    //console.log("LOAD LANDSCAPE BY TIMESTAMP FOR COMMIT ", selectedCommit, " and timestamp ", timestamp);
    self.debug('Start import landscape-request');

    try {
      const [structureDataPromise, dynamicDataPromise] =
        await this.landscapeHttpRequestUtil.requestData(timestamp, interval); // TODO: also request by commit id

      if (
        structureDataPromise.status === 'fulfilled' &&
        dynamicDataPromise.status === 'fulfilled'
      ) {
        const structure = preProcessAndEnhanceStructureLandscape(
          structureDataPromise.value
        );

        const dynamic = dynamicDataPromise.value;

        for (const t of dynamic) {
          const traceId = t.traceId;

          for (const s of t.spanList) {
            s.traceId = traceId;
          }
        }

        return [structure, dynamic] as [
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
