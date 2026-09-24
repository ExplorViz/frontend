import { useAuthStore } from 'explorviz-frontend/src/stores/auth';
import { useLandscapeTokenStore } from 'explorviz-frontend/src/stores/landscape-token';
import { getLogServiceUrl } from 'explorviz-frontend/src/utils/landscape-http-request-util';
import { useCallback } from 'react';

/**
 * Provides a fetch function to retrieve all textual severity
 * (log level) names associated with the current landscape.
 * @returns an asynchronous function for fetching log levels
 */
export default function useLogSeverityFetch() {
  const landscapeToken = useLandscapeTokenStore((state) => state.token);
  const accessToken = useAuthStore((state) => state.accessToken);

  const fetchLogSeverities = useCallback(async () => {
    const logServiceUrl = getLogServiceUrl();
    if (logServiceUrl === '') {
      throw new Error('Log service URL not configured');
    }

    if (!landscapeToken) {
      throw new Error('No landscape token selected');
    }

    const requestUrl = new URL(
      `${logServiceUrl}/v3/landscapes/${landscapeToken.value}/log-levels`
    );

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

    const receivedSeverities = await response.json();
    if (
      !Array.isArray(receivedSeverities) ||
      !receivedSeverities.every((v) => typeof v === 'string')
    ) {
      console.error(`JSON is not string array`);
      throw new Error('Received invalid response');
    }

    return receivedSeverities;
  }, [accessToken, landscapeToken]);

  return fetchLogSeverities;
}
