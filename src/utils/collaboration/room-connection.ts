import { useRoomState as useColyseusRoomState } from '@colyseus/react';
import { Client, type Room } from '@colyseus/sdk';
import { useToastHandlerStore } from 'explorviz-frontend/src/stores/toast-handler';
import { COLLABORATION_SERVICE_PATH } from 'explorviz-frontend/src/utils/collaboration/collaboration-service';
import {
  CONTRACT_VERSION,
  JoinRefusal,
  ROOM_NAME,
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
      const room = await connect({ contractVersion: CONTRACT_VERSION, name });
      room.onLeave((code) => {
        if (get().room !== room) return;
        set({ room: undefined });
        if (code !== CONSENTED_LEAVE) {
          useToastHandlerStore.getState().showInfoToastMessage('You are no longer in the room.', TOAST_HEADER);
        }
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
  };
});

/** The close code of a leave the client asked for. */
const CONSENTED_LEAVE = 4000;

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
    default:
      return `Could not connect to the room: ${(error as Error | undefined)?.message ?? error}`;
  }
}

/** The joined Room's state as an immutable snapshot, or undefined while alone. */
export function useRoomState(): CollaborationState | undefined {
  const room = useRoomConnectionStore((state) => state.room);
  return useColyseusRoomState(room) as CollaborationState | undefined;
}
