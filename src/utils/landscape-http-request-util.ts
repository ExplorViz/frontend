import { useAuthStore } from 'explorviz-frontend/src/stores/auth';
import { useLandscapeTokenStore } from 'explorviz-frontend/src/stores/landscape-token';
import { CommSummary } from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/communication';
import { FunctionCall } from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/function-call';
import { FlatLandscape } from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';

/** Base URL for landscape API. Empty string uses same-origin (Vite dev proxy in development). */
export function getLandscapeServiceUrl(): string {
  const configured = import.meta.env.VITE_LANDSCAPE_SERV_URL as
    | string
    | undefined;
  if (configured === undefined || configured === '') {
    return '';
  }
  return configured.replace(/\/$/, '');
}

/** Base URL for trace API. Empty string uses same-origin (Vite dev proxy in development). */
export function getTraceServiceUrl(): string {
  const configured = import.meta.env.VITE_TRACE_SERV_URL as string | undefined;
  if (configured === undefined || configured === '') {
    return '';
  }
  return configured.replace(/\/$/, '');
}

const landscapeService = getLandscapeServiceUrl();
const traceService = getTraceServiceUrl();

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
  const structureDataPromise = requestStructureData();
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
      `${landscapeService}/v3/landscapes/${useLandscapeTokenStore.getState().token!.value}/structure/runtime`,
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
  return new Promise<CommSummary>((resolve, reject) => {
    if (useLandscapeTokenStore.getState().token === null) {
      reject(new Error('No landscape token selected'));
      return;
    }
    fetch(
      `${traceService}/v3/landscapes/${useLandscapeTokenStore.getState().token!.value}/communication?from=${fromTimestamp}&to=${toTimestamp}`,
      {
        headers: {
          Authorization: `Bearer ${useAuthStore.getState().accessToken}`,
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
      .then(async (response: Response) => {
        if (response.ok) {
          const dynamicData = (await response.json()) as CommSummary;
          dynamicData.fromUnixNano = fromTimestamp;
          dynamicData.toUnixNano = toTimestamp;
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
      `${traceService}/v3/landscapes/${useLandscapeTokenStore.getState().token!.value}/trace-data`,
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

/**
 * Requests detailed information about function calls for a specific entity communication.
 * @param sourceEntityKey Telemetry lookup key of the source entity
 * @param targetEntityKey Telemetry lookup key of the target entity
 * @param fromTimestamp Only consider function calls starting from this Unix epoch nanosecond timestamp
 * @param toTimestamp Only consider function calls starting before this Unix epoch nanosecond timestamp
 * @returns A promise that resolves to an array of function call detail objects
 */
export function requestCommunicationFunctions(
  sourceEntityKey: string,
  targetEntityKey: string,
  fromTimestamp: number,
  toTimestamp: number
) {
  return new Promise<FunctionCall[]>((resolve, reject) => {
    if (useLandscapeTokenStore.getState().token === null) {
      reject(new Error('No landscape token selected'));
      return;
    }
    fetch(
      `${traceService}/v3/landscapes/${useLandscapeTokenStore.getState().token!.value}/communication/${sourceEntityKey}/${targetEntityKey}?from=${fromTimestamp}&to=${toTimestamp}`,
      {
        headers: {
          Authorization: `Bearer ${useAuthStore.getState().accessToken}`,
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
      .then(async (response: Response) => {
        if (response.ok) {
          const data = (await response.json()) as FunctionCall[];
          resolve(data);
        } else {
          reject();
        }
      })
      .catch((e) => reject(e));
  });
}

export function requestFileDetailedData(
  fileRevisionId: string,
  commitHash?: string
) {
  return new Promise<
    import('explorviz-frontend/src/utils/landscape-schemes/file-detailed-data').FileDetailedDto
  >((resolve, reject) => {
    const token = useLandscapeTokenStore.getState().token;
    if (token === null) {
      reject(new Error('No landscape token selected'));
      return;
    }
    if (import.meta.env.VITE_LANDSCAPE_SERV_URL === undefined) {
      reject(
        new Error(
          'VITE_LANDSCAPE_SERV_URL is not configured. Set it in .env or leave it empty to use the Vite dev proxy.'
        )
      );
      return;
    }
    const query = commitHash
      ? `?commitHash=${encodeURIComponent(commitHash)}`
      : '';
    const url = `${landscapeService}/v3/landscapes/${token.value}/structure/evolution/file-revision/${fileRevisionId}${query}`;
    fetch(url, {
      headers: {
        Authorization: `Bearer ${useAuthStore.getState().accessToken}`,
        'Access-Control-Allow-Origin': '*',
      },
    })
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
      .catch((e) => {
        if (e instanceof TypeError) {
          reject(
            new Error(
              `Could not reach landscape service at ${url}. Ensure the landscape-service (or backend-mock with v3 support) is running.`
            )
          );
          return;
        }
        reject(e);
      });
  });
}
