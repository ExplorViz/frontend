import { useRoomState as useColyseusRoomState } from '@colyseus/react';
import { Client, type Room } from '@colyseus/sdk';
import { freshAccessToken } from 'explorviz-frontend/src/stores/auth';
import { useToastHandlerStore } from 'explorviz-frontend/src/stores/toast-handler';
import { isLoginSkipped } from 'explorviz-frontend/src/utils/auth-config';
import { COLLABORATION_SERVICE_PATH } from 'explorviz-frontend/src/utils/collaboration/collaboration-service';
import {
  CONTRACT_VERSION,
  JoinRefusal,
  LeaveCode,
  ROOM_NAME,
  type ClientMessages,
  type CollaborationState,
  type JoinOptions,
} from 'explorviz-frontend/src/utils/collaboration/room-contract.generated';
import { create } from 'zustand';

/** The connection to a Room, as the SDK gives it. */
export type CollaborationRoom = Room;

type RoomConnectionState = {
  /** The joined Room, or undefined while exploring alone. */
  room: CollaborationRoom | undefined;
  /** True while a create or join is under way. */
  connecting: boolean;
  /** Creates a Room and joins it as Host. Refusals are shown as a toast. */
  createRoom: (name: string) => Promise<void>;
  /** Joins the Room with this code. Refusals are shown as a toast. */
  joinRoom: (code: string, name: string) => Promise<void>;
  /** Leaves the Room; exploring goes on alone. */
  leaveRoom: () => Promise<void>;
  /** Host only: removes this Participant from the Room. The service refuses it from anyone else. */
  kick: (sessionId: string) => void;
  /** Host only: makes this Participant the Host instead. The service refuses it from anyone else. */
  handOverHost: (sessionId: string) => void;
};

const TOAST_HEADER = 'Collaboration';

let client: Client | undefined;
const serviceClient = () => (client ??= new Client(`${window.location.origin}${COLLABORATION_SERVICE_PATH}`));

/**
 * The browser's connection to a Room of the collaboration service. The Room's
 * state is read with `useRoomState`; it is never copied into a store.
 */
export const useRoomConnectionStore = create<RoomConnectionState>((set, get) => {
  async function enter(connect: (options: JoinOptions) => Promise<CollaborationRoom>, name: string) {
    if (get().room || get().connecting) return;
    set({ connecting: true });
    try {
      // The service checks the login only now, so hand it a token that is not about to expire.
      serviceClient().auth.token = (isLoginSkipped() ? undefined : await freshAccessToken()) ?? '';
      const room = await connect({ contractVersion: CONTRACT_VERSION, name });
      room.onLeave((code) => {
        if (get().room !== room) return;
        set({ room: undefined });
        const notice = leaveNotice(code);
        if (notice) useToastHandlerStore.getState().showInfoToastMessage(notice, TOAST_HEADER);
      });
      set({ room, connecting: false });
    } catch (error) {
      set({ connecting: false });
      useToastHandlerStore.getState().showErrorToastMessage(refusalMessage(error), TOAST_HEADER);
    }
  }

  return {
    room: undefined,
    connecting: false,
    createRoom: (name) => enter((options) => serviceClient().create(ROOM_NAME, options), name),
    joinRoom: (code, name) => enter((options) => serviceClient().joinById(normalizeRoomCode(code), options), name),
    leaveRoom: async () => {
      const { room } = get();
      if (!room) return;
      set({ room: undefined });
      await room.leave();
    },
    kick: (sessionId) => get().room?.send('kick', { sessionId } satisfies ClientMessages['kick']),
    handOverHost: (sessionId) =>
      get().room?.send('handOverHost', { sessionId } satisfies ClientMessages['handOverHost']),
  };
});

/** The close code of a leave the client asked for. */
const CONSENTED_LEAVE = 4000;

/**
 * What to tell the person when the Room's connection ends with this close code.
 * `LeaveCode.KICKED` marks a kick; such a close must never lead to reconnection.
 */
function leaveNotice(code: number) {
  if (code === CONSENTED_LEAVE) return undefined;
  if (code === LeaveCode.KICKED) return 'The Host removed you from the room.';
  return 'You are no longer in the room.';
}

/** Room codes are capitals and digits; people may type them in lower case or with spaces. */
export function normalizeRoomCode(code: string) {
  return code.replace(/\s/g, '').toUpperCase();
}

function refusalMessage(error: unknown) {
  switch ((error as { code?: number } | undefined)?.code) {
    case JoinRefusal.UNKNOWN_ROOM:
      return 'There is no room with this code.';
    case JoinRefusal.ROOM_FULL:
      return 'The room is full.';
    case JoinRefusal.CONTRACT_MISMATCH:
      return 'The collaboration service was updated. Please reload the page.';
    case JoinRefusal.LOGIN_REQUIRED:
      return 'Please log in again to collaborate.';
    default:
      return `Could not connect to the room: ${(error as Error | undefined)?.message ?? error}`;
  }
}

/** The joined Room's state as an immutable snapshot, or undefined while alone. */
export function useRoomState(): CollaborationState | undefined {
  const room = useRoomConnectionStore((state) => state.room);
  return useColyseusRoomState(room) as CollaborationState | undefined;
}
