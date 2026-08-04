import { useCommunicationStore } from 'explorviz-frontend/src/stores/communication-store';
import { useTimestampRepositoryStore } from 'explorviz-frontend/src/stores/repos/timestamp-repository';
import { requestData } from 'explorviz-frontend/src/utils/landscape-http-request-util';
import { CommSummary } from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/communication';
import { DynamicLandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/trace';
import { FlatLandscape } from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import {
  preProcessAndEnhanceStructureLandscape,
  StructureLandscapeData,
  TypeOfAnalysis,
} from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import { create } from 'zustand';
import { useTimestampPollingStore } from './timestamp-polling';

interface ReloadHandlerState {
  loadLandscapeByTimestamp: (
    timestampFrom: bigint,
    timestampTo?: bigint
  ) => Promise<[FlatLandscape, DynamicLandscapeData, CommSummary]>;
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
    timestampFrom: bigint,
    timestampTo?: bigint
  ) => {
    const bucketSizeMs = BigInt(useTimestampPollingStore.getState().bucketSize);
    const NANOSECONDS_PER_MILLISECOND = 1_000_000n;

    let start = 0n;
    const exact = timestampFrom;
    let end = exact + bucketSizeMs * NANOSECONDS_PER_MILLISECOND;

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
          ? 0n
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
        timestampTo ?? end
      );

      if (structureDataPromise.status !== 'fulfilled') {
        throw Error('No structure data available.', {
          cause: structureDataPromise.reason,
        });
      }

      const flat: FlatLandscape = structureDataPromise.value;
      const aggregatedCommunication: CommSummary =
        dynamicDataPromise.status === 'fulfilled'
          ? dynamicDataPromise.value
          : {
              metrics: {},
              communications: [],
              fromUnixNano: BigInt(0),
              toUnixNano: BigInt(0),
            };

      useCommunicationStore
        .getState()
        .setCommunications(aggregatedCommunication);

      return [flat, [], aggregatedCommunication];
    } catch (e: any) {
      throw Error('Failed to request landscape data', { cause: e });
    }
  },

  loadLandscapeByTimestampSnapshot: async (
    structureData: StructureLandscapeData,
    dynamicData: DynamicLandscapeData
  ) => {
    const structure = preProcessAndEnhanceStructureLandscape(
      structureData,
      TypeOfAnalysis.Runtime
    );
    const dynamic = dynamicData;

    for (const t of dynamic) {
      const traceId = t.traceId;

      for (const s of t.spans) {
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
