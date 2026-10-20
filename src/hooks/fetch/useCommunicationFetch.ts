import { useAuthStore } from 'explorviz-frontend/src/stores/auth';
import { useLandscapeTokenStore } from 'explorviz-frontend/src/stores/landscape-token';
import { getTraceServiceUrl } from 'explorviz-frontend/src/utils/landscape-http-request-util';
import {
  CommSummary,
  isCommSummary,
} from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/communication';
import { useCallback } from 'react';

export interface CommunicationSearchParams {
  /**
   * Beginning of time range (inclusive) within which to search for communication.
   * Specified in nanoseconds since Unix epoch.
   */
  from?: bigint;

  /**
   * End of time range (exclusive) within which to search for communication.
   * Specified in nanoseconds since Unix epoch.
   */
  to?: bigint;

  /**
   * Identifier of a trace that the spans from which the communication is derived must belong to.
   */
  traceId?: string;

  /**
   * Git commit hash that the spans from which the communication is derived must belong to.
   */
  commit?: string;
}

/**
 * Provides a fetch function to search for communication (dynamic data) belonging to the
 * current landscape, with search parameters available via {@link CommunicationSearchParams}.
 * @returns an asynchronous function for fetching communication data for a landscape
 */
export default function useCommunicationFetch() {
  const landscapeToken = useLandscapeTokenStore((state) => state.token);
  const accessToken = useAuthStore((state) => state.accessToken);

  const fetchCommunication = useCallback(
    async (params: CommunicationSearchParams): Promise<CommSummary> => {
      const traceServiceUrl = getTraceServiceUrl();
      if (traceServiceUrl === '') {
        throw new Error('Trace service URL not configured');
      }

      if (!landscapeToken) {
        throw new Error('No landscape token selected');
      }

      const requestUrl = new URL(
        `${traceServiceUrl}/v3/landscapes/${landscapeToken.value}/communication`
      );

      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
          requestUrl.searchParams.set(key, String(value));
        }
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

      const receivedCommSummary = JSON.parse(await response.text(), (k, v) => {
        return k === 'fromUnixNano' || k === 'toUnixNano' ? BigInt(v) : v;
      });
      if (!isCommSummary(receivedCommSummary)) {
        console.error(`JSON fails type guard ${isCommSummary.name}`, {
          json: receivedCommSummary,
        });
        throw new Error('Received invalid response');
      }

      return receivedCommSummary;
    },
    [accessToken, landscapeToken]
  );

  return fetchCommunication;
}
