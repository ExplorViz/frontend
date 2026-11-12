import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';
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
  type DistrictIdSet,
  type DistrictLists,
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
 *
 * While the Host has switched District sharing off, the Districts are the own
 * state even in a Room. Switching it off hands the Room's Districts over to
 * everyone as their own; switching it on hands the Host's own Districts over
 * to the Room (see `setDistrictSharing`).
 *
 * After "close all" the Room keeps a set as every District but a few
 * exceptions (inverted), so no message names every District. This module
 * expands such a set against the Landscape's Districts; nobody else sees it.
 */

export type { DistrictAction };

/** The closed and hidden Districts that are shown. Treat the sets as read-only. */
export type DistrictState = {
  closedDistrictIds: Set<string>;
  hiddenDistrictIds: Set<string>;
};

const currentRoom = () => useRoomConnectionStore.getState().room;

/** The Room whose Districts are shown: the joined Room while it shares its Districts. */
function sharingRoom() {
  const room = currentRoom();
  return room && room.state.districts?.shared !== false ? room : undefined;
}

type DistrictRecord = Record<string, unknown>;
const landscapeDistricts = () => useModelStore.getState().districts as DistrictRecord;

/** One set of the Room's Districts as ids, an inverted one expanded against the Landscape's Districts. */
function expand(ids: Iterable<string>, inverted: boolean | undefined, all: DistrictRecord): Set<string> {
  if (!inverted) return new Set(ids);
  const except = new Set(ids);
  return new Set(Object.keys(all).filter((id) => !except.has(id)));
}

// The Room's state, as Sets. One per snapshot of the Room's map (and per
// Landscape for an inverted one), so a reader sees the same Set until the
// Room's Districts change.
const setsBySnapshot = new WeakMap<
  Record<string, boolean>,
  { inverted: boolean; all: DistrictRecord; set: Set<string> }
>();
function asSet(ids: Record<string, boolean>, inverted: boolean, all: DistrictRecord) {
  let cached = setsBySnapshot.get(ids);
  if (!cached || cached.inverted !== inverted || (inverted && cached.all !== all)) {
    cached = { inverted, all, set: expand(Object.keys(ids), inverted, all) };
    setsBySnapshot.set(ids, cached);
  }
  return cached.set;
}

const EMPTY: Record<string, boolean> = {};
function fromRoomSnapshot(districts: RoomDistricts | undefined, all: DistrictRecord): DistrictState {
  return {
    closedDistrictIds: asSet(districts?.closed ?? EMPTY, !!districts?.closedInverted, all),
    hiddenDistrictIds: asSet(districts?.hidden ?? EMPTY, !!districts?.hiddenInverted, all),
  };
}

/** The Districts of a decoded Room state (maps are MapSchema), expanded. */
function fromDecodedState(districts: CollaborationRoom['state']['districts'] | undefined): DistrictState {
  const all = landscapeDistricts();
  return {
    closedDistrictIds: expand(districts?.closed?.keys() ?? [], districts?.closedInverted, all),
    hiddenDistrictIds: expand(districts?.hidden?.keys() ?? [], districts?.hiddenInverted, all),
  };
}

/** The decoded Room state's Districts, as built Sets; dropped on every state change of the Room. */
let decodedRoomDistricts: { room: CollaborationRoom; state: DistrictState } | undefined;

function fromDecodedRoom(room: CollaborationRoom): DistrictState {
  if (decodedRoomDistricts?.room !== room) {
    decodedRoomDistricts = { room, state: fromDecodedState(room.state.districts) };
  }
  return decodedRoomDistricts.state;
}

const ownDistricts = (): DistrictState => {
  const { closedDistrictIds, hiddenDistrictIds } = useVisualizationStore.getState();
  return { closedDistrictIds, hiddenDistrictIds };
};

/** From how many ids on a set may go as its exceptions instead (well below the 64 KB message limit). */
const INVERT_FROM = 500;

/**
 * The own Districts as lists for the Room. A large set holding most of the
 * Landscape's Districts goes as its exceptions (inverted), so the message
 * stays small after "close all".
 */
const ownDistrictLists = (): DistrictLists => {
  const { closedDistrictIds, hiddenDistrictIds } = ownDistricts();
  const landscape = landscapeDistricts();
  const all = Object.keys(landscape);
  const compact = (set: Set<string>) => {
    const inverted = set.size >= INVERT_FROM && set.size * 2 > all.length && [...set].every((id) => id in landscape);
    return { ids: inverted ? all.filter((id) => !set.has(id)) : [...set], inverted };
  };
  const closed = compact(closedDistrictIds);
  const hidden = compact(hiddenDistrictIds);
  return {
    closed: closed.ids,
    hidden: hidden.ids,
    ...(closed.inverted ? { closedInverted: true } : {}),
    ...(hidden.inverted ? { hiddenInverted: true } : {}),
  };
};

/** The shown Districts, for reading outside of rendering. */
export function getDistricts(): DistrictState {
  const room = sharingRoom();
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
  const all = useModelStore((state) => state.districts) as DistrictRecord;
  return inRoom && roomDistricts?.shared !== false ? select(fromRoomSnapshot(roomDistricts, all)) : own;
}

/** Both sets of the shown Districts, for rendering. */
export function useDistrictState(): DistrictState {
  const closedDistrictIds = useDistricts((districts) => districts.closedDistrictIds);
  const hiddenDistrictIds = useDistricts((districts) => districts.hiddenDistrictIds);
  return { closedDistrictIds, hiddenDistrictIds };
}

/** A Set of District ids for the contract's rule, which may invert it ("close all"). */
const asIdSet = (ids: Set<string>): DistrictIdSet & { ids: Set<string> } => ({
  ids,
  add: (id) => ids.add(id),
  delete: (id) => ids.delete(id),
  clear: () => ids.clear(),
  inverted: false,
});

/** The result of the actions on these Districts, or undefined if they change nothing. */
function changed(districts: DistrictState, actions: readonly DistrictAction[]): DistrictState | undefined {
  const closed = asIdSet(new Set(districts.closedDistrictIds));
  const hidden = asIdSet(new Set(districts.hiddenDistrictIds));
  applyDistrictActions({ closed, hidden }, actions);
  const all = landscapeDistricts();
  const next = {
    closedDistrictIds: expand(closed.ids, closed.inverted, all),
    hiddenDistrictIds: expand(hidden.ids, hidden.inverted, all),
  };
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
  const room = sharingRoom();
  if (room) {
    if (changed(fromDecodedRoom(room), actions)) room.send('districts', actions);
    return;
  }
  const next = changed(ownDistricts(), actions);
  if (next) useVisualizationStore.setState(next);
}

/** Whether the joined Room shares its Districts, or undefined while alone. Shown to everyone. */
export function useDistrictSharing(): boolean | undefined {
  const inRoom = useRoomConnectionStore((state) => state.room !== undefined);
  const shared = useRoomStatePart('districts')?.shared;
  return inRoom ? shared !== false : undefined;
}

/**
 * The Host switched District sharing on or off; the service refuses anyone
 * else. Switching on carries the Host's own Districts, which become the
 * Room's. Either way the view changes only once the service has handled it.
 */
export function setDistrictSharing(shared: boolean) {
  const room = currentRoom();
  if (!room) return;
  if (!shared) {
    room.send('districtSharing', { shared: false });
    return;
  }
  room.send('districtSharing', { shared: true, districts: ownDistrictLists() });
}

const setOwnDistricts = (districts: DistrictState) => useVisualizationStore.setState(districts);
const noDistricts = (): DistrictState => ({ closedDistrictIds: new Set(), hiddenDistrictIds: new Set() });

registerHandOver({
  startingState: () => ({ districts: ownDistrictLists() }),
  enter: (room) => {
    // From now on the Room's Districts are shown; the own ones have no home.
    setOwnDistricts(noDistricts());
    decodedRoomDistricts = undefined;
    // Unknown until the Room's state arrives. Someone joining while sharing
    // is off takes nothing from the Room: it holds no Districts to show.
    let shared = room.state.districts?.shared;
    room.onStateChange((state) => {
      if (decodedRoomDistricts?.room === room) decodedRoomDistricts = undefined;
      const nowShared = state.districts?.shared;
      if (shared === true && nowShared === false) {
        // Switched off: everyone carries on with the Room's Districts as their own.
        setOwnDistricts(fromDecodedState(state.districts));
      } else if (shared === false && nowShared === true) {
        // Switched on: the Room's Districts are shown again; the own ones have no home.
        setOwnDistricts(noDistricts());
      }
      shared = nowShared;
    });
  },
  leave: (lastState) => {
    // While sharing is off, the own Districts are what was shown.
    if (lastState.districts?.shared !== false) {
      setOwnDistricts(fromDecodedState(lastState.districts));
    }
    decodedRoomDistricts = undefined;
  },
});
