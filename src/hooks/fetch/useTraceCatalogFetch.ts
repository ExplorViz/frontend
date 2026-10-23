import { useAuthStore } from 'explorviz-frontend/src/stores/auth';
import { getTraceServiceUrl } from 'explorviz-frontend/src/utils/landscape-http-request-util';
import {
  isTraceOverview,
  TraceOverview,
} from 'explorviz-frontend/src/utils/landscape-schemes/telemetry/traces';
import { useCallback } from 'react';

export interface TraceSearchParams {
  /**
   * Identifier of the landscape for which to fetch communication.
   */
  landscapeTokenId?: string;

  /**
   * Beginning of time range (inclusive) within which to search for traces.
   * Specified in nanoseconds since Unix epoch.
   */
  from?: bigint;

  /**
   * End of time range (exclusive) within which to search for traces.
   * Specified in nanoseconds since Unix epoch.
   */
  to?: bigint;

  /** Name of a service / application that must be involved in the trace. */
  serviceName?: string;

  /** Lookup key of a visualization entity that must be involved in the trace. */
  telemetryKey?: string;

  /** The ordering in which matched traces should be retrieved. */
  sortBy?: TraceSearchOrdering;

  /** How many traces should be returned at most by the fetch. Useful for pagination. */
  limit?: number;

  /** The last seen trace from a previous fetch. Useful for pagination. */
  cursor?: TraceOverview;
}

export type TraceSearchOrdering = 'newest' | 'oldest';

/**
 * Provides a fetch function to search for available traces belonging to a landscape,
 * with various search parameters available via {@link TraceSearchParams}.
 * @returns an asynchronous function for fetching available traces
 */
export default function useTraceCatalogFetch() {
  const accessToken = useAuthStore((state) => state.accessToken);

  const fetchTraceCatalog = useCallback(
    async (params: TraceSearchParams) => {
      const traceServiceUrl = getTraceServiceUrl();
      if (traceServiceUrl === '') {
        throw new Error('Trace service URL not configured');
      }

      const requestUrl = new URL(
        `${traceServiceUrl}/v3/landscapes/${params.landscapeTokenId}/traces`
      );

      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && key !== 'cursor') {
          requestUrl.searchParams.set(key, String(value));
        }
      }

      if (params.cursor) {
        requestUrl.searchParams.set('cursorId', params.cursor.traceId);
        requestUrl.searchParams.set(
          'cursorTimestamp',
          params.cursor.startUnixNano.toString()
        );
        requestUrl.searchParams.set(
          'cursorDuration',
          (params.cursor.endUnixNano - params.cursor.startUnixNano).toString()
        );
      }

      let response: Response;
      try {
        response = await fetch(requestUrl, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Access-Control-Allow-Origin': '*',
          },
        });
      } catch (error) {
        throw new Error('A network error has occurred', { cause: error });
      }

      if (!response.ok) {
        throw new Error(`Received non-ok response status ${response.status}`);
      }

      const receivedTraces = JSON.parse(await response.text(), (k, v) => {
        return k === 'startUnixNano' || k === 'endUnixNano' ? BigInt(v) : v;
      });
      if (
        !Array.isArray(receivedTraces) ||
        !receivedTraces.every(isTraceOverview)
      ) {
        console.error(`JSON fails type guard ${isTraceOverview.name}`, {
          json: receivedTraces,
        });
        throw new Error('Received invalid response');
      }

      return receivedTraces;
    },
    [accessToken]
  );

  return fetchTraceCatalog;
}
