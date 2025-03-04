import { create } from 'zustand';
import eventEmitter from '../utils/event-emitter';
import { DynamicLandscapeData } from 'react-lib/src/utils/landscape-schemes/dynamic/dynamic-data';
import {
  preProcessAndEnhanceStructureLandscape,
  StructureLandscapeData,
  TypeOfAnalysis,
} from 'react-lib/src/utils/landscape-schemes/structure-data';
import { useLandscapeHTTPRequestUtilStateStore } from './landscape-http-request-util';

interface ReloadHandlerState {
  loadLandscapeByTimestamp: (
    timestamp: number,
    interval: number
  ) => Promise<[StructureLandscapeData, DynamicLandscapeData]>;
  loadLandscapeByTimestampSnapshot: (
    structureData: StructureLandscapeData,
    dynamicData: DynamicLandscapeData
  ) => Promise<[StructureLandscapeData, DynamicLandscapeData]>;
}

export const useReloadHandlerStore = create<ReloadHandlerState>((set, get) => ({
  /**
   * Loads a landscape from the backend and triggers a visualization update
   * @method loadLandscapeById
   * @param {*} timestamp
   */
  loadLandscapeByTimestamp: async (
    timestamp: number,
    interval: number = 10
  ) => {
    try {
      const [structureDataPromise, dynamicDataPromise] =
        await useLandscapeHTTPRequestUtilStateStore
          .getState()
          .requestData(timestamp, interval);

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
  },

  loadLandscapeByTimestampSnapshot: async (
    structureData: StructureLandscapeData,
    dynamicData: DynamicLandscapeData
  ) => {
    const structure = preProcessAndEnhanceStructureLandscape(
      structureData,
      TypeOfAnalysis.Dynamic
    );
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
  },
}));
