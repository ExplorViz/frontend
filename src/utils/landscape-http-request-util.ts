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
import { useModelStore } from '../stores/repos/model-repository';
import { findFirstEntityWithOpenedParent } from './city-rendering/communication-layouter';
import AggregatedCommunication from './landscape-schemes/dynamic/aggregated-communication';
import {
  CommSpans,
  isCommSpans,
  isSpan,
  Span,
} from './landscape-schemes/telemetry/traces';

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

/** Base URL for log API. Empty string uses same-origin (Vite dev proxy in development). */
export function getLogServiceUrl(): string {
  const configured = import.meta.env.VITE_LOG_SERV_URL as string | undefined;
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

export async function requestEntitySpans(
  telemetryKey: string,
  limit?: number,
  offset?: number
): Promise<Span[]> {
  const landscapeToken = useLandscapeTokenStore.getState().token?.value;

  if (!landscapeToken) {
    throw new Error('No landscape token selected');
  }

  let url = new URL(
    `${traceService}/v3/landscapes/${landscapeToken}/entities/${telemetryKey}/spans`
  );
  if (limit) url.searchParams.set('limit', limit.toString());
  if (offset) url.searchParams.set('offset', offset.toString());

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${useAuthStore.getState().accessToken}`,
      'Access-Control-Allow-Origin': '*',
    },
  });
  if (!response.ok) {
    throw new Error(`Non-ok response status ${response.status}`);
  }

  const spans = JSON.parse(await response.text(), (k, v) => {
    return k === 'startUnixNano' || k === 'endUnixNano' ? BigInt(v) : v;
  });
  if (!Array.isArray(spans) || !spans.every(isSpan)) {
    throw new Error(`JSON fails type guard ${isSpan.name}`);
  }
  return spans;
}

/**
 * Fetches detailed information on the span pairs underlying a particular communication.
 * @param communication The communication for which span information should be retrieved.
 * @returns A promise that resolves to a {@link CommSpans} with detailed span information for the communication.
 */
export async function requestCommunicationSpans(
  communication: AggregatedCommunication
): Promise<CommSpans> {
  const landscapeToken = useLandscapeTokenStore.getState().token?.value;

  if (!landscapeToken) {
    throw new Error('No landscape token selected');
  }

  if (communication.buildingCommunicationIds.length === 0) {
    throw new Error('No building communications provided');
  }

  const buildingComms = communication.getBuildingCommunications();
  const sourceTargetPairs = buildingComms.map((buildingComm) => ({
    source: buildingComm.sourceEntityKey,
    target: buildingComm.targetEntityKey,
  }));

  const from = communication.fromUnixNano;
  const to = communication.toUnixNano;

  const response = await fetch(
    `${traceService}/v3/landscapes/${landscapeToken}/communication/spans?from=${from}&to=${to}`,
    {
      method: 'POST',
      body: JSON.stringify(sourceTargetPairs),
      headers: {
        Authorization: `Bearer ${useAuthStore.getState().accessToken}`,
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
  if (!response.ok) {
    throw new Error(`Non-ok response status ${response.status}`);
  }

  const commSpans = JSON.parse(await response.text(), (k, v) => {
    return k === 'startUnixNano' || k === 'endUnixNano' ? BigInt(v) : v;
  });
  if (!isCommSpans(commSpans)) {
    throw new Error(`JSON fails type guard ${isCommSpans.name}`);
  }
  return commSpans;
}

/**
 * Requests detailed information about function calls for all building communications
 * within the provided aggregated communication.
 * @param communications Communication for which to look up underlying function calls
 * @returns A promise that resolves to an array of function call detail objects
 */
export async function requestCommunicationFunctions(
  communication: AggregatedCommunication
): Promise<CommFunction[]> {
  const landscapeToken = useLandscapeTokenStore.getState().token?.value;

  if (!landscapeToken) {
    throw new Error('No landscape token selected');
  }

  if (communication.buildingCommunicationIds.length === 0) {
    throw new Error('No building communications provided');
  }

  const buildingComms = communication.getBuildingCommunications();
  const telemetryKeyToEntityId =
    useModelStore.getState().telemetryKeyToEntityId;

  const sourceTargetPairs = buildingComms
    .map((buildingComm) => {
      let srcKey = buildingComm.sourceEntityKey;
      let tgtKey = buildingComm.targetEntityKey;

      if (communication.isBidirectional) {
        // Bidirectional communication may be aggregated from two oppositely facing uni-directional communications.
        // In this case, the source and target entity of the aggregated communication will be swapped compared to at least
        // one of the underlying building communications. We then have to swap the source and target for the functions request
        // to ensure the directionality of the returned function calls is correct relative to the aggregated communcation.
        const srcId = telemetryKeyToEntityId.get(srcKey);
        const tgtId = telemetryKeyToEntityId.get(tgtKey);

        if (!srcId || !tgtId) {
          console.error(
            `Could not find entity ID for telemetry key: ${!srcId ? srcKey : tgtKey}`
          );
          return undefined;
        }

        const srcContainer = findFirstEntityWithOpenedParent(srcId);
        const tgtContainer = findFirstEntityWithOpenedParent(tgtId);

        if (
          srcContainer === communication.targetEntity.id &&
          tgtContainer === communication.sourceEntity.id
        ) {
          [srcKey, tgtKey] = [tgtKey, srcKey];
        }
      }

      return { source: srcKey, target: tgtKey };
    })
    .filter((res) => res !== undefined);

  const from = communication.fromUnixNano;
  const to = communication.toUnixNano;

  const response = await fetch(
    `${traceService}/v3/landscapes/${landscapeToken}/communication/functions?from=${from}&to=${to}`,
    {
      method: 'POST',
      body: JSON.stringify(sourceTargetPairs),
      headers: {
        Authorization: `Bearer ${useAuthStore.getState().accessToken}`,
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
  if (!response.ok) {
    throw new Error(`Non-ok response status ${response.status}`);
  }

  const commFuncs = await response.json();
  if (!Array.isArray(commFuncs) || !commFuncs.every(isCommFunction)) {
    throw new Error(`JSON fails type guard ${isCommFunction.name}`);
  }
  return commFuncs;
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

export type FileHistory = {
  commitHash: string;
  date: number;
  action: string;
};

export function requestFileHistory(
  repositoryName: string,
  fileRevisionId: string
) {
  return new Promise<FileHistory[]>((resolve, reject) => {
    const token = useLandscapeTokenStore.getState().token;
    if (token === null) {
      reject(new Error('No landscape token selected'));
      return;
    }
    const url =
      `${landscapeService}/v3/landscapes/${token.value}/structure/evolution/` +
      `${encodeURIComponent(repositoryName)}/file-history/${fileRevisionId}`;
    fetch(url, {
      headers: {
        Authorization: `Bearer ${useAuthStore.getState().accessToken}`,
        'Access-Control-Allow-Origin': '*',
      },
    })
      .then(async (response) => {
        if (response.ok) resolve((await response.json()) as FileHistory[]);
        else reject();
      })
      .catch(reject);
  });
}

