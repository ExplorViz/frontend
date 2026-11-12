/**
 * Where the browser reaches the collaboration service: a path on the
 * frontend's own host, forwarded with the prefix stripped (Vite dev server,
 * nginx in production).
 */
export const COLLABORATION_SERVICE_PATH = '/collaboration';

const HEALTH_CHECK_TIMEOUT_MS = 5000;

/**
 * Whether the collaboration service answers its health check. Anything else
 * than its exact answer (a proxy error, a web server's index page, a network
 * error, a timeout) counts as not reachable.
 */
export async function isCollaborationServiceReachable(): Promise<boolean> {
  try {
    const response = await fetch(`${COLLABORATION_SERVICE_PATH}/__healthcheck`, {
      signal: AbortSignal.timeout(HEALTH_CHECK_TIMEOUT_MS),
    });
    return response.ok && (await response.text()).trim() === 'OK';
  } catch {
    return false;
  }
}
