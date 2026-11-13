import { freshAccessToken } from 'explorviz-frontend/src/stores/auth';
import { isLoginSkipped } from 'explorviz-frontend/src/utils/auth-config';
import type { RoomListing } from './room-contract.generated';

/**
 * Where the browser reaches the collaboration service: a path on the
 * frontend's own host, forwarded with the prefix stripped (Vite dev server,
 * nginx in production).
 */
export const COLLABORATION_SERVICE_PATH = '/collaboration';

const REQUEST_TIMEOUT_MS = 5000;

/**
 * Whether the collaboration service answers its health check. Anything else
 * than its exact answer (a proxy error, a web server's index page, a network
 * error, a timeout) counts as not reachable.
 */
export async function isCollaborationServiceReachable(): Promise<boolean> {
  try {
    const response = await fetch(`${COLLABORATION_SERVICE_PATH}/__healthcheck`, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    return response.ok && (await response.text()).trim() === 'OK';
  } catch {
    return false;
  }
}

/**
 * The open Rooms anyone may browse and join. With login on, the service wants
 * the same login token as for entering a Room. Throws if they cannot be loaded.
 */
export async function listRooms(): Promise<RoomListing[]> {
  const token = isLoginSkipped() ? undefined : await freshAccessToken();
  const response = await fetch(`${COLLABORATION_SERVICE_PATH}/rooms`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Listing rooms failed with status ${response.status}.`);
  return response.json();
}
