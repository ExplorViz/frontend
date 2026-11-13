import { useLandscapeTokenStore, type LandscapeToken } from 'explorviz-frontend/src/stores/landscape-token';
import { useToastHandlerStore } from 'explorviz-frontend/src/stores/toast-handler';
import {
  registerHandOver,
  useRoomConnectionStore,
  type CollaborationRoom,
} from 'explorviz-frontend/src/utils/collaboration/room-connection';
import type { ClientMessages } from 'explorviz-frontend/src/utils/collaboration/room-contract.generated';

/*
 * The collaboration module for the Landscape that is explored.
 *
 * Which Landscape the page loads is the Landscape token store's `token`, as
 * before; the rest of the frontend opens a Landscape by setting it there. In
 * a Room, the Landscape is the Room's state (its `landscapeToken`, a token
 * value) and this module makes the token store follow it:
 *
 * - entering a Room, and whenever the Room's Landscape changes, the token
 *   store gets the Room's Landscape, so the page loads it;
 * - when the Host opens another Landscape, the module asks the service to
 *   switch the Room's Landscape (which clears the Room's state tied to the
 *   old one, see `clearLandscapeState` in the service);
 * - when anyone else opens another Landscape, they are taken back to the
 *   Room's and told that only the Host can switch it.
 *
 * Leaving a Room leaves the token store as it is: the person carries on
 * alone on the Room's last Landscape.
 */

const TOAST_HEADER = 'Collaboration';

/** The Room being followed, and its Landscape as last seen. */
let followed: { room: CollaborationRoom; roomLandscape: string } | undefined;

/** The token of the Room's Landscape once it was loaded, to go back to it without asking the user service. */
let roomLandscapeToken: LandscapeToken | undefined;

/** Counts loads, so that only the latest one is applied. */
let loads = 0;

const tokenStore = () => useLandscapeTokenStore.getState();

/** The followed Room, once it is the connected one. */
const connected = () => (followed && followed.room === useRoomConnectionStore.getState().room ? followed : undefined);

/** Loads the Room's Landscape, unless it is loaded already. */
function followRoom() {
  const value = followed?.roomLandscape;
  if (!value) return;
  const { token } = tokenStore();
  if (token?.value === value) {
    roomLandscapeToken = token;
  } else if (roomLandscapeToken?.value === value) {
    tokenStore().setToken(roomLandscapeToken);
  } else {
    void load(value);
  }
}

/** Opens the Landscape with this token value, with its details from the person's Landscapes if they have it. */
async function load(value: string) {
  const load = ++loads;
  let token: LandscapeToken | undefined;
  try {
    token = (await tokenStore().retrieveTokens()).find((candidate) => candidate.value === value);
  } catch {
    // Without the person's list the token value is still enough to load the Landscape.
  }
  if (load !== loads || connected()?.roomLandscape !== value) return;
  roomLandscapeToken = token ?? unlistedLandscape(value);
  tokenStore().setToken(roomLandscapeToken);
}

/** A Landscape of the Room that the person's own list does not have (for example, someone else's). */
function unlistedLandscape(value: string): LandscapeToken {
  return {
    value,
    alias: value,
    created: 0,
    ownerId: '',
    sharedUsersIds: [],
    isRequestedFromVSCodeExtension: false,
    projectName: '',
    commitId: '',
  };
}

// Someone opened a Landscape (or left it for the Landscape selection).
useLandscapeTokenStore.subscribe((state, previous) => {
  const value = state.token?.value;
  const current = connected();
  if (!current || !value || value === previous.token?.value || value === current.roomLandscape) return;
  const { room } = current;
  if (room.sessionId === room.state.hostId) {
    room.send('switchLandscape', {
      landscapeToken: value,
      landscapeName: state.token?.alias,
    } satisfies ClientMessages['switchLandscape']);
    return;
  }
  if (!current.roomLandscape) return;
  useToastHandlerStore
    .getState()
    .showInfoToastMessage('Only the Host can switch the Landscape of the room.', TOAST_HEADER);
  // Not from inside the store's own update.
  queueMicrotask(followRoom);
});

registerHandOver({
  startingState: () => {
    const value = tokenStore().token?.value;
    return value ? { landscapeToken: value, landscapeName: tokenStore().token?.alias } : {};
  },
  enter: (room) => {
    followed = { room, roomLandscape: room.state.landscapeToken ?? '' };
    roomLandscapeToken = undefined;
    room.onStateChange(() => {
      if (followed?.room !== room) return;
      const roomLandscape = room.state.landscapeToken ?? '';
      if (roomLandscape === followed.roomLandscape) return;
      followed.roomLandscape = roomLandscape;
      followRoom();
    });
    followRoom();
  },
  leave: () => {
    followed = undefined;
    loads++;
  },
});
