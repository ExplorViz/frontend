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
  /**
   * True while the connection to the joined Room is down and the SDK tries to
   * get it back. The Room's last seen state stays on screen; shared actions
   * are dropped, not sent later.
   */
  reconnecting: boolean;
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
      // The service checks the login only now, so hand it a token that is not about to expire.
      serviceClient().auth.token = (isLoginSkipped() ? undefined : await freshAccessToken()) ?? '';
      const options: JoinOptions = { contractVersion: CONTRACT_VERSION, name };
      if (entry === 'created') options.startingState = startingState();
      const room = await connect(options);
      // Shared actions taken while reconnecting are ignored rather than sent once the connection is back.
      room.reconnection.maxEnqueuedMessages = 0;
      room.onDrop(() => {
        if (get().room === room) set({ reconnecting: true });
      });
      room.onReconnect(() => {
        if (get().room === room) set({ reconnecting: false });
      });
      room.onLeave((code) => {
        if (get().room !== room) return;
        leave(room);
        const notice = leaveNotice(code);
        if (notice) useToastHandlerStore.getState().showInfoToastMessage(notice, TOAST_HEADER);
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
    set({ room: undefined, reconnecting: false });
  }

  return {
    room: undefined,
    connecting: false,
    reconnecting: false,
    createRoom: (name) => enter('created', (options) => serviceClient().create(ROOM_NAME, options), name),
    joinRoom: (code, name) =>
      enter('joined', (options) => serviceClient().joinById(normalizeRoomCode(code), options), name),
    leaveRoom: async () => {
      const { room } = get();
      if (!room) return;
      leave(room);
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
 * `LeaveCode.KICKED` marks a kick, which the SDK never retries. Any other code
 * means the connection was lost for good: reconnecting failed, the held seat
 * expired, or the service shut down or restarted.
 */
function leaveNotice(code: number) {
  if (code === CONSENTED_LEAVE) return undefined;
  if (code === LeaveCode.KICKED) return 'The Host removed you from the room.';
  return 'The connection to the room was lost. You carry on alone from what you last saw.';
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

/*
 * Helpers for the capability modules, so each of them reads the joined Room
 * the same way.
 */

/** The joined Room, or undefined while alone; for reading outside of rendering. */
export const currentRoom = () => useRoomConnectionStore.getState().room;

/** Whether a Room is joined, for rendering. */
export function useInRoom(): boolean {
  return useRoomConnectionStore((state) => state.room !== undefined);
}

/**
 * A value worked out from the joined Room's decoded state (e.g. a Set of
 * ids), kept until the Room's state changes, so readers outside of rendering
 * get the same object between patches.
 */
export function decodedStateCache<T>(compute: (room: CollaborationRoom) => T) {
  let cached: { room: CollaborationRoom; value: T } | undefined;
  const watched = new WeakSet<CollaborationRoom>();
  return {
    get(room: CollaborationRoom): T {
      if (!watched.has(room)) {
        watched.add(room);
        room.onStateChange(() => {
          if (cached?.room === room) cached = undefined;
        });
      }
      if (cached?.room !== room) cached = { room, value: compute(room) };
      return cached.value;
    },
    /** Forgets the value, e.g. when the Room is entered or left. */
    drop() {
      cached = undefined;
    },
  };
}

/** Whether two sets of ids hold the same ids. */
export function sameIds(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
  return a.size === b.size && [...a].every((id) => b.has(id));
}

/** Whether the connection to the joined Room is down and being retried (see `reconnecting`). */
export function useReconnecting(): boolean {
  return useRoomConnectionStore((state) => state.reconnecting);
}

/**
 * One top-level part of the joined Room's state as an immutable snapshot, or
 * undefined while alone. Re-renders only when that part changed.
 */
export function useRoomStatePart<K extends keyof CollaborationState>(key: K): CollaborationState[K] | undefined {
  const room = useRoomConnectionStore((state) => state.room);
  return useColyseusRoomState(room, (state: any) => state[key]) as CollaborationState[K] | undefined;
}

/**
 * The joined Room's state as an immutable snapshot, or undefined while alone.
 * Also undefined for the moment between joining and the Room's first full
 * state: the SDK resolves `create`/`joinById` before it, and until then the
 * state has no fields.
 */
export function useRoomState(): CollaborationState | undefined {
  const room = useRoomConnectionStore((state) => state.room);
  const snapshot = useColyseusRoomState(room) as Partial<CollaborationState> | undefined;
  return snapshot?.participants ? (snapshot as CollaborationState) : undefined;
}
