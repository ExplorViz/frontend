import { useAuthStore } from 'explorviz-frontend/src/stores/auth';
import { useLandscapeTokenStore } from 'explorviz-frontend/src/stores/landscape-token';
import {
  CommSummary,
  isCommSummary,
} from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/communication';
import {
  CommFunction,
  isCommFunction,
} from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/function-call';
import { FileDetailedDto } from 'explorviz-frontend/src/utils/landscape-schemes/file-detailed-data';
import {
  FlatLandscape,
  isFlatLandscape,
} from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';

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
const NANOSECONDS_PER_MILLISECOND = 1_000_000n;

export function nanosecondsToMilliseconds(nanos: bigint): number {
  return Number(nanos / NANOSECONDS_PER_MILLISECOND);
}

export function millisecondsToNanoseconds(millis: bigint): bigint {
  return millis * NANOSECONDS_PER_MILLISECOND;
}

export async function requestData(startTime: bigint, endTime: bigint) {
  const structureDataPromise = requestStructureData();
  const dynamicDataPromise = requestDynamicData(startTime, endTime);

  const landscapeData = Promise.allSettled([
    structureDataPromise,
    dynamicDataPromise,
  ]);

  return landscapeData;
}

/**
 * Fetches the landscape structure derived from runtime analysis which is not tied to a particular commit.
 * @returns A promise that resolves to the landscape model derived from cross-commit runtime data.
 */
export function requestStructureData() {
  return new Promise<FlatLandscape>((resolve, reject) => {
    if (useLandscapeTokenStore.getState().token === null) {
      return reject(new Error('No landscape token selected'));
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
        if (!response.ok) {
          return reject(new Error(`Non-ok response status ${response.status}`));
        }
        const structureData = await response.json();
        return isFlatLandscape(structureData)
          ? resolve(structureData)
          : reject(new Error(`JSON fails type guard ${isFlatLandscape.name}`));
      })
      .catch((e) => reject(e));
  });
}

/**
 * Fetches the runtime entity communication for the given time interval.
 * @param fromTimestamp Starting timestamp from which to search communication, in nanoseconds since Unix epoch.
 * @param toTimestamp Ending timestamp up to which to search communication, in nanoseconds since Unix epoch.
 * @returns A promise that resolves to the communication within the given time interval.
 */
export function requestDynamicData(fromTimestamp: bigint, toTimestamp: bigint) {
  return new Promise<CommSummary>((resolve, reject) => {
    if (useLandscapeTokenStore.getState().token === null) {
      return reject(new Error('No landscape token selected'));
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
        if (!response.ok) {
          return reject(new Error(`Non-ok response status ${response.status}`));
        }
        const dynamicData = JSON.parse(await response.text(), (k, v) => {
          return k === 'fromUnixNano' || k === 'toUnixNano' ? BigInt(v) : v;
        });
        return isCommSummary(dynamicData)
          ? resolve(dynamicData)
          : reject(new Error(`JSON fails type guard ${isCommSummary.name}`));
      })
      .catch((e) => reject(e));
  });
}

export function deleteTraceData(): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (useLandscapeTokenStore.getState().token === null) {
      return reject(new Error('No landscape token selected'));
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
        if (!response.ok) {
          const errorText = await response.text();
          return reject(new Error(`Failed to delete trace data: ${errorText}`));
        }
        return resolve();
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
  fromTimestamp: bigint,
  toTimestamp: bigint
) {
  return new Promise<CommFunction[]>((resolve, reject) => {
    if (useLandscapeTokenStore.getState().token === null) {
      return reject(new Error('No landscape token selected'));
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
        if (!response.ok) {
          return reject(new Error(`Non-ok response status ${response.status}`));
        }
        const commFuncs = await response.json();
        return Array.isArray(commFuncs) && commFuncs.every(isCommFunction)
          ? resolve(commFuncs)
          : reject(new Error(`JSON fails type guard ${isCommFunction.name}`));
      })
      .catch((e) => reject(e));
  });
}

export function requestFileDetailedData(
  fileRevisionId: string,
  commitHash?: string
) {
  return new Promise<FileDetailedDto>((resolve, reject) => {
    const token = useLandscapeTokenStore.getState().token;
    if (token === null) {
      return reject(new Error('No landscape token selected'));
    }

    if (import.meta.env.VITE_LANDSCAPE_SERV_URL === undefined) {
      return reject(
        new Error(
          'VITE_LANDSCAPE_SERV_URL is not configured. Set it in .env or leave it empty to use the Vite dev proxy.'
        )
      );
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
        if (!response.ok) {
          return reject(
            new Error(
              `Failed to fetch file detailed data: ${response.statusText}`
            )
          );
        }
        const data = (await response.json()) as FileDetailedDto;
        return resolve(data);
      })
      .catch((e) => {
        if (e instanceof TypeError) {
          return reject(
            new Error(
              `Could not reach landscape service at ${url}. Ensure the landscape-service (or backend-mock with v3 support) is running.`
            )
          );
        }
        reject(e);
      });
  });
}
