import { useAuthStore } from 'explorviz-frontend/src/stores/auth';
import { useLandscapeTokenStore } from 'explorviz-frontend/src/stores/landscape-token';
import { getLogServiceUrl } from 'explorviz-frontend/src/utils/landscape-http-request-util';
import { isLog } from 'explorviz-frontend/src/utils/landscape-schemes/telemetry/logs';
import { useCallback } from 'react';

export interface LogSearchParams {
  /**
   * Search tokens which must be present in matched logs.
   * By default, only the log message body is searched. This can be changed
   * via {@link includeAttributeKeys} and {@link includeAttributeValues}.
   */
  messageBody?: string;

  /**
   * Whether to also search the keys of log and resource attributes
   * for the provided search tokens in {@link messageBody}
   */
  includeAttributeKeys?: boolean;

  /**
   * Whether to also search the values of log and resource attributes
   * for the provided search tokens in {@link messageBody}
   */
  includeAttributeValues?: boolean;

  /** Name of service / application that all matched logs must belong to */
  serviceName?: string;

  /** Lookup key of a visualization entity to which all matched logs must belong */
  telemetryKey?: string;

  /**
   * Minimum severity (log level) that all matched logs must have
   */
  minSeverity?: number;

  /**
   * Maximum severity (log level) that all matched logs must have
   */
  maxSeverity?: number;

  /**
   * Only match logs where the severity has this exact text representation.
   * As opposed to the numeric severity, this has no standardized set of values,
   * therefore possible values depend on the logging framework used.
   */
  severityText?: string;

  /**
   * Beginning of time range (inclusive) within which all matched logs must occur.
   * Specified in nanoseconds since Unix epoch */
  from?: bigint;

  /**
   * End of time range (exclusive) within which all matched logs must occur.
   * Specified in nanoseconds since Unix epoch */
  to?: bigint;

  /** Identifier of a trace that all matched logs must be associated with */
  traceId?: string;

  /** Identifier of a span that all matched logs must be associated with */
  spanId?: string;

  /** The ordering in which matched logs should be retrieved */
  sortBy?: LogSearchOrdering;

  /** How many logs should be returned at most by the fetch. Useful for pagination. */
  limit?: number;

  /** Identifier of the last seen log from a previous fetch. Useful for pagination. */
  cursor?: LogSearchCursor;
}

export type LogSearchOrdering = 'newest' | 'oldest' | 'severity';

/** Specifies the last known log from a previous fetch, for use with pagination. */
export interface LogSearchCursor {
  /** Log ID of the last known log */
  cursorId: string;

  /** Start time of the last known log */
  cursorTimestamp: bigint;

  /** Severity of the last known log (used when sorting by severity) */
  cursorSeverity: number;
}

/**
 * Provides a fetch function to search for logs belonging to the current landscape,
 * with various search parameters available via {@link LogSearchParams}.
 * @returns an asynchronous function for fetching logs
 */
export default function useLogFetch() {
  const landscapeToken = useLandscapeTokenStore((state) => state.token);
  const accessToken = useAuthStore((state) => state.accessToken);

  const fetchLogs = useCallback(
    async (params: LogSearchParams) => {
      const logServiceUrl = getLogServiceUrl();
      if (logServiceUrl === '') {
        throw new Error('Log service URL not configured');
      }

      if (!landscapeToken) {
        throw new Error('No landscape token selected');
      }

      const requestUrl = new URL(
        `${logServiceUrl}/v3/landscapes/${landscapeToken.value}/logs`
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

      const receivedLogs = JSON.parse(await response.text(), (k, v) => {
        return k === 'timeUnixNano' ? BigInt(v) : v;
      });
      if (!Array.isArray(receivedLogs) || !receivedLogs.every(isLog)) {
        console.error(`JSON fails type guard ${isLog.name}`);
        throw new Error('Received invalid response');
      }

      return receivedLogs;
    },
    [accessToken, landscapeToken]
  );

  return fetchLogs;
}
