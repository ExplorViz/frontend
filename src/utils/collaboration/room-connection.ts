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
  type StartingState,
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

/** How a Room was entered. */
export type Entry = 'created' | 'joined';

/**
 * What a capability's collaboration module does at the moments its state
 * changes home (create, join, leave). Each module registers one with
 * `registerHandOver`; the room connection calls them, the rest of the
 * frontend knows nothing of it.
 */
export type HandOver = {
  /** Creating: the module's part of the creator's own state, which becomes the Room's. */
  startingState?: () => StartingState;
  /**
   * The Room was entered and its state is about to be shown: drop the own
   * state (on joining, all local exploration state is dropped).
   */
  enter?: (room: CollaborationRoom, entry: Entry) => void;
  /**
   * The Room is about to be left, for whatever reason: the Room's last state
   * (decoded, so maps are MapSchema) becomes the own state, so the person
   * carries on with what they saw.
   */
  leave?: (lastState: CollaborationRoom['state']) => void;
};

const handOvers = new Set<HandOver>();

/** Adds a capability's hand-over. Returns a function that removes it again. */
export function registerHandOver(handOver: HandOver) {
  handOvers.add(handOver);
  return () => {
    handOvers.delete(handOver);
  };
}

function startingState(): StartingState {
  return Object.assign({}, ...Array.from(handOvers, (handOver) => handOver.startingState?.() ?? {}));
}

let client: Client | undefined;
const serviceClient = () => (client ??= new Client(`${window.location.origin}${COLLABORATION_SERVICE_PATH}`));

/**
 * The browser's connection to a Room of the collaboration service. The Room's
 * state is read with `useRoomState`; it is never copied into a store.
 */
export const useRoomConnectionStore = create<RoomConnectionState>((set, get) => {
  async function enter(entry: Entry, connect: (options: JoinOptions) => Promise<CollaborationRoom>, name: string) {
    if (get().room || get().connecting) return;
    set({ connecting: true });
    try {
      const options: JoinOptions = { contractVersion: CONTRACT_VERSION, name };
      if (entry === 'created') options.startingState = startingState();
      const room = await connect(options);
      room.onLeave((code) => {
        if (get().room !== room) return;
        leave(room);
        if (code !== CONSENTED_LEAVE) {
          useToastHandlerStore.getState().showInfoToastMessage('You are no longer in the room.', TOAST_HEADER);
        }
      });
      for (const handOver of handOvers) handOver.enter?.(room, entry);
      set({ room, connecting: false });
    } catch (error) {
      set({ connecting: false });
      useToastHandlerStore.getState().showErrorToastMessage(refusalMessage(error), TOAST_HEADER);
    }
  }

  /** The own state takes over before the Room stops being shown, so the view does not jump. */
  function leave(room: CollaborationRoom) {
    for (const handOver of handOvers) handOver.leave?.(room.state);
    set({ room: undefined });
  }

  return {
    room: undefined,
    connecting: false,
    createRoom: (name) => enter('created', (options) => serviceClient().create(ROOM_NAME, options), name),
    joinRoom: (code, name) =>
      enter('joined', (options) => serviceClient().joinById(normalizeRoomCode(code), options), name),
    leaveRoom: async () => {
      const { room } = get();
      if (!room) return;
      leave(room);
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

/**
 * One top-level part of the joined Room's state as an immutable snapshot, or
 * undefined while alone. Re-renders only when that part changed.
 */
export function useRoomStatePart<K extends keyof CollaborationState>(key: K): CollaborationState[K] | undefined {
  const room = useRoomConnectionStore((state) => state.room);
  return useColyseusRoomState(room, (state: any) => state[key]) as CollaborationState[K] | undefined;
}

/** The joined Room's state as an immutable snapshot, or undefined while alone. */
export function useRoomState(): CollaborationState | undefined {
  const room = useRoomConnectionStore((state) => state.room);
  return useColyseusRoomState(room) as CollaborationState | undefined;
}
