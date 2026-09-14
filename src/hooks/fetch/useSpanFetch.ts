import { useAuthStore } from 'explorviz-frontend/src/stores/auth';
import { useLandscapeTokenStore } from 'explorviz-frontend/src/stores/landscape-token';
import { getTraceServiceUrl } from 'explorviz-frontend/src/utils/landscape-http-request-util';
import {
  isSpan,
  Span,
} from 'explorviz-frontend/src/utils/landscape-schemes/telemetry/traces';

export interface SpanSearchParams {
  /**
   * Search tokens which must be present in the span.
   * By default, only the span name is searched. This can be changed via
   * {@link includeAttributeKeys} and {@link includeAttributeValues}.
   */
  searchString?: string;

  /**
   * Whether to also search the keys of span and resource attributes
   * for the provided search string in {@link searchString}
   */
  includeAttributeKeys?: boolean;

  /**
   * Whether to also search the values of span and resource attributes
   * for the provided search string in {@link searchString}
   */
  includeAttributeValues?: boolean;

  /** The span kind all matched spans must have.
   * @see {@link Span.kind}
   */
  kind?: string;

  /** Identifier of a trace that all matched spans must be part of */
  traceId?: string;

  /** Name of service / application that all matched spans must belong to */
  serviceName?: string;

  /** Lookup key of a visualization entity to which all matched spans must belong */
  telemetryKey?: string;

  /**
   * Beginning of time range (inclusive) within which all matched spans must start.
   * Specified in nanoseconds since Unix epoch */
  from?: bigint;

  /**
   * End of time range (exclusive) within which all matched spans must start.
   * Specified in nanoseconds since Unix epoch */
  to?: bigint;

  /** The ordering in which matched spans should be retrieved */
  sortBy?: SpanSearchOrdering;

  /** How many spans should be returned at most by the fetch. Useful for pagination. */
  limit?: number;

  /** Identifier of the last seen span from a previous fetch. Useful for pagination. */
  cursor?: SpanSearchCursor;
}

export type SpanSearchOrdering = 'newest' | 'oldest' | 'duration';

/** Specifies the last known span from a previous fetch, for use with pagination. */
export interface SpanSearchCursor {
  /** Span ID of the last known span */
  cursorId: string;

  /** Start time of the last known span */
  cursorTimestamp: bigint;

  /** Duration of the last known span (used when sorting by duration) */
  cursorDuration: bigint;
}

/**
 * Provides a fetch function to search for spans belonging to the current landscape,
 * with various search parameters available via {@link SpanSearchParams}.
 * @returns an asynchronous function for fetching spans
 */
export default function useSpanFetch() {
  const landscapeToken = useLandscapeTokenStore((state) => state.token);
  const accessToken = useAuthStore((state) => state.accessToken);

  const fetchSpans = async (params: SpanSearchParams) => {
    const traceServiceUrl = getTraceServiceUrl();
    if (traceServiceUrl === '') {
      throw new Error('Trace service URL not configured');
    }

    if (!landscapeToken) {
      throw new Error('No landscape token selected');
    }

    const requestUrl = new URL(
      `${traceServiceUrl}/v3/landscapes/${landscapeToken.value}/spans`
    );

    const queryParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && key !== 'cursor') {
        queryParams.set(key, String(value));
      }
    }

    if (params.cursor) {
      for (const [key, value] of Object.entries(params.cursor)) {
        if (value !== undefined) {
          queryParams.set(key, String(value));
        }
      }
    }

    requestUrl.search = queryParams.toString();

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

    const receivedSpans = JSON.parse(await response.text(), (k, v) => {
      return k === 'startUnixNano' || k === 'endUnixNano' ? BigInt(v) : v;
    });
    if (!Array.isArray(receivedSpans) || !receivedSpans.every(isSpan)) {
      console.error(`JSON fails type guard ${isSpan.name}`);
      throw new Error('Received invalid response');
    }

    return receivedSpans;
  };

  return fetchSpans;
}
