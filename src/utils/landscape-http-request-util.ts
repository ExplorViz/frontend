import { useAuthStore } from 'explorviz-frontend/src/stores/auth';
import { useLandscapeTokenStore } from 'explorviz-frontend/src/stores/landscape-token';
import { AggregatedBuildingCommunication } from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/aggregated-file-communication';
import { EntityPairCommunicationDto } from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/entity-pair-communication';
import { FlatLandscape } from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';

const persistenceService = import.meta.env.VITE_PERSISTENCE_SERV_URL;

// Helper functions to convert between nanoseconds and milliseconds
// The backend now uses nanoseconds, but frontend Date objects use milliseconds
const NANOSECONDS_PER_MILLISECOND = 1_000_000;

export function nanosecondsToMilliseconds(nanos: number): number {
  return Math.floor(nanos / NANOSECONDS_PER_MILLISECOND);
}

export function millisecondsToNanoseconds(millis: number): number {
  return millis * NANOSECONDS_PER_MILLISECOND;
}

export async function requestData(
  startTime: number,
  exactTime: number,
  endTime: number
) {
  const structureDataPromise = requestStructureData(/* startTime, endTime */);
  const dynamicDataPromise = requestDynamicData(startTime, exactTime, endTime);

  const landscapeData = Promise.allSettled([
    structureDataPromise,
    dynamicDataPromise,
  ]);

  return landscapeData;
}

export function requestStructureData(/* fromTimestamp: number, toTimestamp: number */) {
  return new Promise<FlatLandscape>((resolve, reject) => {
    if (useLandscapeTokenStore.getState().token === null) {
      reject(new Error('No landscape token selected'));
      return;
    }
    fetch(
      `${persistenceService}/v3/landscapes/${useLandscapeTokenStore.getState().token!.value}/structure/runtime`,
      {
        headers: {
          Authorization: `Bearer ${useAuthStore.getState().accessToken}`,
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
      .then(async (response: Response) => {
        if (response.ok) {
          const structureData = (await response.json()) as FlatLandscape;
          resolve(structureData);
        } else {
          reject();
        }
      })
      .catch((e) => reject(e));
  });
}

export function requestDynamicData(
  fromTimestamp: number,
  exactTimestamp: number,
  toTimestamp: number
) {
  return new Promise<AggregatedBuildingCommunication>((resolve, reject) => {
    if (useLandscapeTokenStore.getState().token === null) {
      reject(new Error('No landscape token selected'));
      return;
    }
    fetch(
      `${persistenceService}/v3/landscapes/${useLandscapeTokenStore.getState().token!.value}/file-communication?from=${fromTimestamp}&to=${toTimestamp}`,
      {
        headers: {
          Authorization: `Bearer ${useAuthStore.getState().accessToken}`,
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
      .then(async (response: Response) => {
        if (response.ok) {
          const dynamicData =
            (await response.json()) as AggregatedBuildingCommunication;
          dynamicData.from = fromTimestamp;
          dynamicData.to = toTimestamp;
          resolve(dynamicData);
        } else {
          reject();
        }
      })
      .catch((e) => reject(e));
  });
}

export function deleteTraceData(): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (useLandscapeTokenStore.getState().token === null) {
      reject(new Error('No landscape token selected'));
      return;
    }
    fetch(
      `${persistenceService}/v3/landscapes/${useLandscapeTokenStore.getState().token!.value}/trace-data`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${useAuthStore.getState().accessToken}`,
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
      .then(async (response: Response) => {
        if (response.ok || response.status === 204) {
          resolve();
        } else {
          const errorText = await response.text();
          reject(new Error(`Failed to delete trace data: ${errorText}`));
        }
      })
      .catch((e) => reject(e));
  });
}
export function requestCommunicationFunctions(
  sourceEntityId: string,
  targetEntityId: string,
  fromTimestamp: number,
  toTimestamp: number
) {
  return new Promise<EntityPairCommunicationDto[]>((resolve, reject) => {
    if (useLandscapeTokenStore.getState().token === null) {
      reject(new Error('No landscape token selected'));
      return;
    }
    fetch(
      `${persistenceService}/v3/landscapes/${useLandscapeTokenStore.getState().token!.value}/communication/${sourceEntityId}/${targetEntityId}?from=${fromTimestamp}&to=${toTimestamp}`,
      {
        headers: {
          Authorization: `Bearer ${useAuthStore.getState().accessToken}`,
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
      .then(async (response: Response) => {
        if (response.ok) {
          const data = (await response.json()) as EntityPairCommunicationDto[];
          resolve(data);
        } else {
          reject();
        }
      })
      .catch((e) => reject(e));
  });
}

export function requestFileDetailedData(fileRevisionId: string) {
  return new Promise<import('explorviz-frontend/src/utils/landscape-schemes/file-detailed-data').FileDetailedDto>(
    (resolve, reject) => {
      const token = useLandscapeTokenStore.getState().token;
      if (token === null) {
        reject(new Error('No landscape token selected'));
        return;
      }
      fetch(
        `${persistenceService}/v3/landscapes/${token.value}/structure/evolution/file-revision/${fileRevisionId}`,
        {
          headers: {
            Authorization: `Bearer ${useAuthStore.getState().accessToken}`,
            'Access-Control-Allow-Origin': '*',
          },
        }
      )
        .then(async (response: Response) => {
          if (response.ok) {
            const data =
              (await response.json()) as import('explorviz-frontend/src/utils/landscape-schemes/file-detailed-data').FileDetailedDto;
            resolve(data);
          } else {
            reject(
              new Error(
                `Failed to fetch file detailed data: ${response.statusText}`
              )
            );
          }
        })
        .catch((e) => reject(e));
    }
  );
}
