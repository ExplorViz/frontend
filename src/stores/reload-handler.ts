import { create } from 'zustand';
import { DynamicLandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/dynamic-data';
import {
  preProcessAndEnhanceStructureLandscape,
  StructureLandscapeData,
  TypeOfAnalysis,
} from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import { useTimestampRepositoryStore } from './repos/timestamp-repository';
import { requestData } from '../utils/landscape-http-request-util';

interface ReloadHandlerState {
  loadLandscapeByTimestamp: (
    timestampFrom: number,
    timestampTo?: number
  ) => Promise<[StructureLandscapeData, DynamicLandscapeData]>;
  loadLandscapeByTimestampSnapshot: (
    structureData: StructureLandscapeData,
    dynamicData: DynamicLandscapeData
  ) => Promise<[StructureLandscapeData, DynamicLandscapeData]>;
  findLastIndexPolyfill: <T>(
    array: T[],
    predicate: (value: T, index: number, array: T[]) => boolean
  ) => number;

}

export const useReloadHandlerStore = create<ReloadHandlerState>((set, get) => ({
  /**
   * Loads a landscape from the backend and triggers a visualization update
   * @method loadLandscapeById
   * @param {*} timestamp
   */
  loadLandscapeByTimestamp: async (
    timestampFrom: number,
    timestampTo?: number
  ) => {
    try {

      const getTimestampsForCommitId =
        useTimestampRepositoryStore.getState().getTimestampsForCommitId;

      let listOfAllTimestamps = getTimestampsForCommitId(
        'cross-commit',
        false // we are interested for the newest timestamp that is not from a debug snapshot and that is equal to or comes before timestampFrom
      );

      const timestampIndex1 = get().findLastIndexPolyfill(
        listOfAllTimestamps,
        (timestamp) => timestamp.epochNano <= timestampFrom
      );

      const tenSecondBucketEpochNano =
        timestampIndex1 === -1
          ? 0
          : listOfAllTimestamps[timestampIndex1].epochNano;

      listOfAllTimestamps = useTimestampRepositoryStore.getState().getTimestampsForCommitId(
        'cross-commit',
        true
      );

      const timestampIndex2 = listOfAllTimestamps.findIndex(
        (ts) => ts.epochNano > timestampFrom
      );

      const start = tenSecondBucketEpochNano;
      const exact = timestampFrom;
      const intervalInSeconds = 10;
      const NANOSECONDS_PER_SECOND = 1_000_000_000;
      const end =
        timestampIndex2 === -1
          ? exact + intervalInSeconds * NANOSECONDS_PER_SECOND
          : listOfAllTimestamps[timestampIndex2].epochNano;
      const [structureDataPromise, dynamicDataPromise] =
        await requestData(
          start,
          exact,
          timestampTo ?? end
        );

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

  findLastIndexPolyfill: <T>(
    array: T[],
    predicate: (value: T, index: number, array: T[]) => boolean
  ) => {
    for (let i = array.length - 1; i >= 0; i--) {
      if (predicate(array[i], i, array)) {
        return i;
      }
    }
    return -1;
  },

}));
