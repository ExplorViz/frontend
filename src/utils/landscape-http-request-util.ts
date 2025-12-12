import { StructureLandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import { DynamicLandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/dynamic-data';
import { useAuthStore } from 'explorviz-frontend/src/stores/auth';
import { useLandscapeTokenStore } from 'explorviz-frontend/src/stores/landscape-token';

const spanService = import.meta.env.VITE_SPAN_SERV_URL;

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
  return new Promise<StructureLandscapeData>((resolve, reject) => {
    if (useLandscapeTokenStore.getState().token === null) {
      reject(new Error('No landscape token selected'));
      return;
    }
    fetch(
      `${spanService}/v2/landscapes/${useLandscapeTokenStore.getState().token!.value}/structure`,
      {
        headers: {
          Authorization: `Bearer ${useAuthStore.getState().accessToken}`,
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
      .then(async (response: Response) => {
        if (response.ok) {
          const structureData =
            (await response.json()) as StructureLandscapeData;
          structureData.k8sNodes = structureData.k8sNodes || [];
          resolve(structureData);
        } else {
          reject();
        }
      })
      .catch((e) => reject(e));
  });
}

export function requestDynamicData(fromTimestamp: number, exactTimestamp: number, toTimestamp: number) {
  return new Promise<DynamicLandscapeData>((resolve, reject) => {
    if (useLandscapeTokenStore.getState().token === null) {
      reject(new Error('No landscape token selected'));
      return;
    }
    fetch(
      `${spanService}/v2/landscapes/${useLandscapeTokenStore.getState().token!.value}/dynamic?from=${fromTimestamp}&exact=${exactTimestamp}&to=${toTimestamp}`,
      {
        headers: {
          Authorization: `Bearer ${useAuthStore.getState().accessToken}`,
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
      .then(async (response: Response) => {
        if (response.ok) {
          const dynamicData = (await response.json()) as DynamicLandscapeData;
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
      `${spanService}/v2/landscapes/${useLandscapeTokenStore.getState().token!.value}/trace-data`,
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
