import Service from '@ember/service';
import Evented from '@ember/object/evented';

import debugLogger from 'ember-debug-logger';
import { DynamicLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/dynamic/dynamic-data';
import {
  preProcessAndEnhanceStructureLandscape,
  StructureLandscapeData,
  TypeOfAnalysis,
} from 'explorviz-frontend/utils/landscape-schemes/structure-data';
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
  async loadLandscapeByTimestamp(timestamp: number, interval: number = 10) {
    this.debug('Start landscape request');

    try {
      const [structureDataPromise, dynamicDataPromise] =
        await this.landscapeHttpRequestUtil.requestData(timestamp, interval);

      if (
        structureDataPromise.status === 'fulfilled' &&
        dynamicDataPromise.status === 'fulfilled'
      ) {
        const structure = preProcessAndEnhanceStructureLandscape(
          structureDataPromise.value,
          TypeOfAnalysis.Dynamic
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

  async loadLandscapeByTimestampSnapshot(
    structureData: StructureLandscapeData,
    dynamicData: DynamicLandscapeData
  ) {
    const structure = preProcessAndEnhanceStructureLandscape(structureData);
    const dynamic = dynamicData;

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
}

declare module '@ember/service' {
  interface Registry {
    'reload-handler': ReloadHandler;
  }
}
