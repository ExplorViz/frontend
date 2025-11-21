import { StructureLandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import { DynamicLandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/dynamic-data';
import { useAuthStore } from 'explorviz-frontend/src/stores/auth';
import { useLandscapeTokenStore } from 'explorviz-frontend/src/stores/landscape-token';

const spanService = import.meta.env.VITE_SPAN_SERV_URL;

// Helper functions to convert between nanoseconds and milliseconds
// The backend now uses nanoseconds, but frontend Date objects use milliseconds
const NANOSECONDS_PER_MILLISECOND = 1_000_000;
const NANOSECONDS_PER_SECOND = 1_000_000_000;

export function nanosecondsToMilliseconds(nanos: number): number {
  return Math.floor(nanos / NANOSECONDS_PER_MILLISECOND);
}

export function millisecondsToNanoseconds(millis: number): number {
  return millis * NANOSECONDS_PER_MILLISECOND;
}

export async function requestData(
  startTime: number,
  intervalInSeconds: number
) {
  // startTime is expected to be in nanoseconds from the backend
  // Calculate endTime in nanoseconds
  const endTime = startTime + intervalInSeconds * NANOSECONDS_PER_SECOND;

  const structureDataPromise = requestStructureData(/* startTime, endTime */);
  const dynamicDataPromise = requestDynamicData(startTime, endTime);

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

export function requestDynamicData(fromTimestamp: number, toTimestamp: number) {
  return new Promise<DynamicLandscapeData>((resolve, reject) => {
    if (useLandscapeTokenStore.getState().token === null) {
      reject(new Error('No landscape token selected'));
      return;
    }
    fetch(
      `${spanService}/v2/landscapes/${useLandscapeTokenStore.getState().token!.value}/dynamic?from=${fromTimestamp}&to=${toTimestamp}`,
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
