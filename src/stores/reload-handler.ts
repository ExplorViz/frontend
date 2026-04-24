import { useCommunicationStore } from 'explorviz-frontend/src/stores/communication-store';
import { useTimestampRepositoryStore } from 'explorviz-frontend/src/stores/repos/timestamp-repository';
import { requestData } from 'explorviz-frontend/src/utils/landscape-http-request-util';
import { AggregatedBuildingCommunication } from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/aggregated-file-communication';
import { DynamicLandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/dynamic-data';
import { FlatLandscape } from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import {
  preProcessAndEnhanceStructureLandscape,
  StructureLandscapeData,
  TypeOfAnalysis,
} from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import { create } from 'zustand';

interface ReloadHandlerState {
  loadLandscapeByTimestamp: (
    timestampFrom: number,
    timestampTo?: number
  ) => Promise<
    [FlatLandscape, DynamicLandscapeData, AggregatedBuildingCommunication]
  >;
  loadLandscapeByTimestampSnapshot: (
    structureData: StructureLandscapeData,
    dynamicData: DynamicLandscapeData
  ) => Promise<
    [StructureLandscapeData, DynamicLandscapeData, FlatLandscape | undefined]
  >;
  findLastIndexPolyfill: <T>(
    array: T[],
    predicate: (value: T) => boolean
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
    const intervalInSeconds = 10;
    const NANOSECONDS_PER_SECOND = 1_000_000_000;

    let start = 0;
    const exact = timestampFrom;
    let end = exact + intervalInSeconds * NANOSECONDS_PER_SECOND;

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

      start = tenSecondBucketEpochNano;

      listOfAllTimestamps = useTimestampRepositoryStore
        .getState()
        .getTimestampsForCommitId('cross-commit', true);

      const timestampIndex2 = listOfAllTimestamps.findIndex(
        (ts) => ts.epochNano > timestampFrom
      );

      if (timestampIndex2 !== -1) {
        end = listOfAllTimestamps[timestampIndex2].epochNano;
      }
    } catch (e) {
      console.error('Error calculating timestamps: ', e);
    }

    try {
      const [structureDataPromise, dynamicDataPromise] = await requestData(
        start,
        exact,
        timestampTo ?? end
      );

      if (structureDataPromise.status === 'fulfilled') {
        const flat: FlatLandscape = structureDataPromise.value;
        const aggregatedCommunication: AggregatedBuildingCommunication =
          dynamicDataPromise.status === 'fulfilled'
            ? dynamicDataPromise.value
            : { metrics: {}, communications: [] };

        useCommunicationStore
          .getState()
          .setCommunications(aggregatedCommunication);

        return [flat, [], aggregatedCommunication];
      }
      throw Error('No data available.');
    } catch (e: any) {
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

    return [structure, dynamic, undefined];
  },

  findLastIndexPolyfill: <T>(array: T[], predicate: (value: T) => boolean) => {
    for (let i = array.length - 1; i >= 0; i--) {
      if (predicate(array[i])) {
        return i;
      }
    }
    return -1;
  },
}));
