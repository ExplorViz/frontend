import { DynamicLandscapeData } from '../utils/landscape-schemes/dynamic-data';
import {
  preProcessAndEnhanceStructureLandscape,
  StructureLandscapeData,
} from '../utils/landscape-schemes/structure-data';
import LandscapeListener from './landscape-listener';

export default class ReloadHandler {
  landscapeListener!: LandscapeListener;

  /**
   * Loads a landscape from the backend and triggers a visualization update
   * @method loadLandscapeById
   * @param {*} timestamp
   */
  async loadLandscapeByTimestamp(timestamp: number, interval: number = 10) {
    const self = this;

    try {
      const [structureDataPromise, dynamicDataPromise] =
        await this.landscapeListener.requestData(timestamp, interval);

      if (
        structureDataPromise.status === 'fulfilled' &&
        dynamicDataPromise.status === 'fulfilled'
      ) {
        const structure = preProcessAndEnhanceStructureLandscape(
          structureDataPromise.value
        );

        return [structure, dynamicDataPromise.value] as [
          StructureLandscapeData,
          DynamicLandscapeData
        ];
      }
      throw Error('No data available.');
    } catch (e: any) {
      throw Error(e);
    }
  }
}
