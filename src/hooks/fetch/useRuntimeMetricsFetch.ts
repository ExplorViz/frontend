import { useAuthStore } from 'explorviz-frontend/src/stores/auth';
import { useLandscapeTokenStore } from 'explorviz-frontend/src/stores/landscape-token';
import { getMetricsServiceUrl } from 'explorviz-frontend/src/utils/landscape-http-request-util';
import {
  isMetricOverview,
  MetricsPointKind,
} from 'explorviz-frontend/src/utils/landscape-schemes/telemetry/metrics';
import { useCallback } from 'react';

export interface MetricsSearchParams {
  /**
   * Search tokens which must be present in the metric.
   * By default, only the metric name is searched. This can be changed via
   * {@link includeDescription} and {@link includeAttributes}.
   */
  searchString?: string;

  /**
   * Whether to also search the metric description
   * for the provided search string in {@link searchString}
   */
  includeDescription?: boolean;

  /**
   * Whether to also search metric, scope and resource attribute keys
   * for the provided search string in {@link searchString}
   */
  includeAttributeKeys?: boolean;

  /**
   * Whether to also search metric, scope and resource attribute values
   * for the provided search string in {@link searchString}
   */
  includeAttributeValues?: boolean;

  /**
   * The kind of datapoint that matched metrics should consist of.
   */
  pointKind?: MetricsPointKind;

  /** Name of service / application that all matched metrics must belong to */
  serviceName?: string;

  /** Lookup key of a visualization entity to which all matched metrics must belong */
  telemetryKey?: string;

  /** The ordering in which matched metrics should be retrieved */
  sortBy?: MetricsSearchOrdering;

  /** How many metrics should be returned at most by the fetch. Useful for pagination. */
  limit?: number;

  /** Identifier of the last seen metric from a previous fetch. Useful for pagination. */
  cursor?: MetricsSearchCursor;
}

export type MetricsSearchOrdering = 'nameAsc' | 'nameDesc';

/** Specifies the last known metric from a previous fetch, for use with pagination. */
export interface MetricsSearchCursor {
  /** Name of the last known metric */
  cursorName: string;

  /** Datapoint  */
  cursorPointKind: string;
}

/**
 * Provides a fetch function to search for available metrics belonging to the current landscape,
 * with various search parameters available via {@link MetricsSearchParams}. Note that the fetch
 * does not return the metric values themselves, but rather an overview of metrics that can be visualized.
 * @returns an asynchronous function for fetching available metrics
 */
export default function useRuntimeMetricsFetch() {
  const landscapeToken = useLandscapeTokenStore((state) => state.token);
  const accessToken = useAuthStore((state) => state.accessToken);

  const fetchMetrics = useCallback(
    async (params: MetricsSearchParams) => {
      const metricsServiceUrl = getMetricsServiceUrl();
      if (metricsServiceUrl === '') {
        throw new Error('Metrics service URL not configured');
      }

      if (!landscapeToken) {
        throw new Error('No landscape token selected');
      }

      const requestUrl = new URL(
        `${metricsServiceUrl}/v3/landscapes/${landscapeToken.value}/metrics`
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

      const receivedMetrics = JSON.parse(await response.text(), (k, v) => {
        return k === 'timeUnixNano' || k === 'startTimeUnixNano'
          ? BigInt(v)
          : v;
      });
      if (
        !Array.isArray(receivedMetrics) ||
        !receivedMetrics.every(isMetricOverview)
      ) {
        console.error(`JSON fails type guard ${isMetricOverview.name}`, {
          json: receivedMetrics,
        });
        throw new Error('Received invalid response');
      }

      return receivedMetrics;
    },
    [accessToken, landscapeToken]
  );

  return fetchMetrics;
}
