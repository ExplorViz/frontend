import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import {
  registerHandOver,
  useRoomConnectionStore,
  useRoomStatePart,
  type CollaborationRoom,
} from 'explorviz-frontend/src/utils/collaboration/room-connection';
import {
  applyDistrictActions,
  type DistrictAction,
  type Districts as RoomDistricts,
} from 'explorviz-frontend/src/utils/collaboration/room-contract.generated';

/*
 * The collaboration module for closed and hidden Districts.
 *
 * It answers "which Districts are closed and hidden?" and accepts "the user
 * did this" for the rest of the frontend, and decides on its own where that
 * state lives: alone it is the person's own state (the District sets of the
 * visualization store, which only this module touches); in a Room it is the
 * Room's state, read directly from the service and changed only by asking
 * the service. Nothing is mirrored between the two; they hand over only when
 * a Room is created, joined or left (see the hand-over at the end).
 */

export type { DistrictAction };

/** The closed and hidden Districts that are shown. Treat the sets as read-only. */
export type DistrictState = {
  closedDistrictIds: Set<string>;
  hiddenDistrictIds: Set<string>;
};

const currentRoom = () => useRoomConnectionStore.getState().room;

// The Room's state, as Sets. One per snapshot of the Room's map, so a reader
// sees the same Set until the Room's Districts change.
const setsBySnapshot = new WeakMap<Record<string, boolean>, Set<string>>();
function asSet(ids: Record<string, boolean>) {
  let set = setsBySnapshot.get(ids);
  if (!set) {
    set = new Set(Object.keys(ids));
    setsBySnapshot.set(ids, set);
  }
  return set;
}

const EMPTY: Record<string, boolean> = {};
function fromRoomSnapshot(districts: RoomDistricts | undefined): DistrictState {
  return {
    closedDistrictIds: asSet(districts?.closed ?? EMPTY),
    hiddenDistrictIds: asSet(districts?.hidden ?? EMPTY),
  };
}

/** The decoded Room state's Districts, as built Sets; dropped on every state change of the Room. */
let decodedRoomDistricts: { room: CollaborationRoom; state: DistrictState } | undefined;

function fromDecodedRoom(room: CollaborationRoom): DistrictState {
  if (decodedRoomDistricts?.room !== room) {
    const districts = room.state.districts;
    decodedRoomDistricts = {
      room,
      state: {
        closedDistrictIds: new Set<string>(districts?.closed?.keys() ?? []),
        hiddenDistrictIds: new Set<string>(districts?.hidden?.keys() ?? []),
      },
    };
  }
  return decodedRoomDistricts.state;
}

const ownDistricts = (): DistrictState => {
  const { closedDistrictIds, hiddenDistrictIds } = useVisualizationStore.getState();
  return { closedDistrictIds, hiddenDistrictIds };
};

/** The shown Districts, for reading outside of rendering. */
export function getDistricts(): DistrictState {
  const room = currentRoom();
  return room ? fromDecodedRoom(room) : ownDistricts();
}

/**
 * The shown Districts, for rendering. `select` must return a primitive or one
 * of the sets, not a new object.
 */
export function useDistricts<T>(select: (districts: DistrictState) => T): T {
  const inRoom = useRoomConnectionStore((state) => state.room !== undefined);
  const own = useVisualizationStore((state) =>
    select({ closedDistrictIds: state.closedDistrictIds, hiddenDistrictIds: state.hiddenDistrictIds })
  );
  const roomDistricts = useRoomStatePart('districts');
  return inRoom ? select(fromRoomSnapshot(roomDistricts)) : own;
}

/** Both sets of the shown Districts, for rendering. */
export function useDistrictState(): DistrictState {
  const closedDistrictIds = useDistricts((districts) => districts.closedDistrictIds);
  const hiddenDistrictIds = useDistricts((districts) => districts.hiddenDistrictIds);
  return { closedDistrictIds, hiddenDistrictIds };
}

/** The result of the actions on these Districts, or undefined if they change nothing. */
function changed(districts: DistrictState, actions: readonly DistrictAction[]): DistrictState | undefined {
  const next = {
    closedDistrictIds: new Set(districts.closedDistrictIds),
    hiddenDistrictIds: new Set(districts.hiddenDistrictIds),
  };
  applyDistrictActions({ closed: next.closedDistrictIds, hidden: next.hiddenDistrictIds }, actions);
  const same = (a: Set<string>, b: Set<string>) => a.size === b.size && [...a].every((id) => b.has(id));
  if (
    same(next.closedDistrictIds, districts.closedDistrictIds) &&
    same(next.hiddenDistrictIds, districts.hiddenDistrictIds)
  ) {
    return undefined;
  }
  return {
    closedDistrictIds: same(next.closedDistrictIds, districts.closedDistrictIds)
      ? districts.closedDistrictIds
      : next.closedDistrictIds,
    hiddenDistrictIds: same(next.hiddenDistrictIds, districts.hiddenDistrictIds)
      ? districts.hiddenDistrictIds
      : next.hiddenDistrictIds,
  };
}

/**
 * The user did this: one click's worth of District actions. Alone it changes
 * the own Districts at once; in a Room it is sent to the service as one
 * message, and the view follows once the service has applied it.
 */
export function changeDistricts(actions: DistrictAction[]) {
  const room = currentRoom();
  if (room) {
    if (changed(fromDecodedRoom(room), actions)) room.send('districts', actions);
    return;
  }
  const next = changed(ownDistricts(), actions);
  if (next) useVisualizationStore.setState(next);
}

const setOwnDistricts = (closed: Iterable<string>, hidden: Iterable<string>) =>
  useVisualizationStore.setState({ closedDistrictIds: new Set(closed), hiddenDistrictIds: new Set(hidden) });

registerHandOver({
  startingState: () => {
    const { closedDistrictIds, hiddenDistrictIds } = ownDistricts();
    return { districts: { closed: [...closedDistrictIds], hidden: [...hiddenDistrictIds] } };
  },
  enter: (room) => {
    // From now on the Room's Districts are shown; the own ones have no home.
    setOwnDistricts([], []);
    decodedRoomDistricts = undefined;
    room.onStateChange(() => {
      if (decodedRoomDistricts?.room === room) decodedRoomDistricts = undefined;
    });
  },
  leave: (lastState) => {
    setOwnDistricts(lastState.districts?.closed?.keys() ?? [], lastState.districts?.hidden?.keys() ?? []);
    decodedRoomDistricts = undefined;
  },
});
