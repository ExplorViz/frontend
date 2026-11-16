import { useAuthStore } from 'explorviz-frontend/src/stores/auth';
import { useLandscapeTokenStore } from 'explorviz-frontend/src/stores/landscape-token';
import { isLoginSkipped } from 'explorviz-frontend/src/utils/auth-config';
import { readDisplayName } from 'explorviz-frontend/src/utils/collaboration/display-name';
import { enterListedRoom } from 'explorviz-frontend/src/utils/collaboration/listed-rooms';
import { normalizeRoomCode, useRoomConnectionStore } from 'explorviz-frontend/src/utils/collaboration/room-connection';

/*
 * Room links. While a Room is joined, the visualization page carries its room
 * code in the URL (`?room=K7XQ2M`), so the address can be shared as is.
 * Opening such a link joins the Room and loads its Landscape. The Landscape
 * token is not needed in the link: the Room decides which Landscape is shown.
 */

/** The query parameter that holds the room code. */
export const ROOM_PARAM = 'room';

/** A link that opens the visualization in the Room with this code. */
export function roomLink(code: string): string {
  const url = new URL('/visualization', window.location.origin);
  url.searchParams.set(ROOM_PARAM, code);
  return url.toString();
}

/**
 * Joins the Room of a link: under the login's name, or the remembered display
 * name while login is off ("Anonymous" if there is none). Resolves to the
 * Room's Landscape token value once the token store has it ("" if the Room
 * has no Landscape yet), or undefined if joining failed (the refusal is shown
 * as a toast).
 */
export async function joinRoomFromLink(code: string): Promise<string | undefined> {
  const name = isLoginSkipped() ? readDisplayName() : (useAuthStore.getState().user?.name ?? '');
  const normalized = normalizeRoomCode(code);
  const landscape = await enterListedRoom(normalized, name);
  if (landscape) await landscapeLoaded(landscape, normalized);
  return landscape;
}

/** Resolves once the token store holds this Landscape, or once the Room is no longer joined. */
function landscapeLoaded(value: string, code: string): Promise<void> {
  const done = () =>
    useLandscapeTokenStore.getState().token?.value === value || useRoomConnectionStore.getState().room?.roomId !== code;
  if (done()) return Promise.resolve();
  return new Promise((resolve) => {
    const check = () => {
      if (!done()) return;
      stopTokens();
      stopRoom();
      resolve();
    };
    const stopTokens = useLandscapeTokenStore.subscribe(check);
    const stopRoom = useRoomConnectionStore.subscribe(check);
  });
}
