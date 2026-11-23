import { useLayoutStore } from 'explorviz-frontend/src/stores/layout-store';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import {
  currentRoom,
  decodedStateCache,
  registerHandOver,
  useInRoom,
  useRoomConnectionStore,
  useRoomStatePart,
  type CollaborationRoom,
} from 'explorviz-frontend/src/utils/collaboration/room-connection';
import {
  layoutArrangementChunks,
  type LayoutArrangement,
  type LayoutOptions,
} from 'explorviz-frontend/src/utils/collaboration/room-contract.generated';
import {
  adoptArrangements,
  cloneArrangements,
  peekOwnArrangements,
  resetMaxRectsLayout,
  takeArrangementChanges,
  type Arrangements,
} from 'explorviz-frontend/src/utils/layout/stable-arrangement';
import { LAYOUT_SETTING_IDS } from 'explorviz-frontend/src/utils/settings/layout-settings';
import { VisualizationSettings } from 'explorviz-frontend/src/utils/settings/settings-schemas';

/*
 * The collaboration module for the layout.
 *
 * Alone, the layout options are the person's own settings and the stable
 * layout's places are the layouter's own memory. In a Room both are the
 * Room's, and the Host decides them, so that every Participant sees each
 * entity at the same place:
 *
 * - Options: the Room's layout options are applied to everyone else's
 *   settings, and their own changes of a layout setting are taken back. The
 *   Host's changes of a layout setting are sent to the Room.
 * - Places: everyone else lays out with the Room's places, the Host with its
 *   own, whose changes it sends to the Room. Only the Host writes them, so
 *   nobody overwrites anybody. The stable layout places entities
 *   deterministically, so whoever shows the same data as the Host computes
 *   the same places before they arrive.
 *
 * Both hand over when a Room is created (the creator's become the Room's),
 * joined (the joiner's are dropped) and left (the Room's become the own), and
 * when the Host right passes on (the new Host carries on from the Room's).
 */

const isHostOf = (room: CollaborationRoom) => room.state.hostId !== undefined && room.state.hostId === room.sessionId;

/** The joined Room if someone else decides the layout in it. */
function roomDecidedByHost(): CollaborationRoom | undefined {
  const room = currentRoom();
  return room && room.state.hostId && !isHostOf(room) ? room : undefined;
}

/* Options */

const ownSettings = () => useUserSettingsStore.getState().visualizationSettings;

function encodeOptions(settings: VisualizationSettings): LayoutOptions {
  return Object.fromEntries(LAYOUT_SETTING_IDS.map((id) => [id, JSON.stringify(settings[id].value)]));
}

/** The Room's layout options as setting id -> JSON value. */
function roomOptions(room: CollaborationRoom): Map<string, string> {
  return new Map(room.state.layout?.options?.entries() ?? []);
}

/** Whether the settings hold every one of these layout options. */
function holdsOptions(settings: VisualizationSettings, options: Map<string, string>): boolean {
  const own = encodeOptions(settings);
  return [...options].every(([id, value]) => !(id in own) || own[id] === value);
}

/** The Room's layout options become the own settings (one change, so one relayout). */
function applyRoomOptions(room: CollaborationRoom) {
  const options = roomOptions(room);
  const settings = ownSettings();
  if (holdsOptions(settings, options)) return;
  const next = { ...settings } as Record<string, { value: unknown }>;
  for (const [id, value] of options) {
    if (!LAYOUT_SETTING_IDS.includes(id as never) || !(id in next)) continue;
    try {
      next[id] = { ...next[id], value: JSON.parse(value) };
    } catch {
      // A value the Host's frontend could not have sent; the own one stays.
    }
  }
  useUserSettingsStore.setState({ visualizationSettings: next as unknown as VisualizationSettings });
}

/** The options the Host sent last, so a change is sent once even before the Room has it. */
let lastSentOptions: string | undefined;

// A layout setting changed: the Host's change goes to the Room, anyone else's is taken back.
useUserSettingsStore.subscribe((state, previous) => {
  if (state.visualizationSettings === previous.visualizationSettings) return;
  const room = currentRoom();
  if (!room?.state.hostId) return;
  if (!isHostOf(room)) {
    applyRoomOptions(room);
    return;
  }
  const options = encodeOptions(state.visualizationSettings);
  const encoded = JSON.stringify(options);
  if (encoded === lastSentOptions || holdsOptions(state.visualizationSettings, roomOptions(room))) return;
  lastSentOptions = encoded;
  room.send('layoutOptions', { options });
});

/* Places */

function fromDecoded(arrangement: CollaborationRoom['state']['layout']['arrangement'] | undefined): Arrangements {
  const arrangements: Arrangements = new Map();
  arrangement?.forEach((container: any, containerId: string) => {
    const slots = new Map();
    container.places?.forEach((place: any, childId: string) => {
      slots.set(childId, { x: place.x, z: place.z, width: place.width, depth: place.depth });
    });
    arrangements.set(containerId, { width: container.width, slots });
  });
  return arrangements;
}

const decodedRoomArrangements = decodedStateCache((room) => fromDecoded(room.state.layout?.arrangement));

/**
 * The places to lay out with, if they are not the own ones: in a Room,
 * everyone but the Host gets a copy of the Room's, to place what the Host has
 * not laid out yet in. Undefined means the own places.
 */
export function getSharedArrangements(): Arrangements | undefined {
  const room = roomDecidedByHost();
  return room ? cloneArrangements(decodedRoomArrangements.get(room)) : undefined;
}

function encodeArrangements(arrangements: Arrangements, containerIds: Iterable<string>): LayoutArrangement {
  const encoded: LayoutArrangement = {};
  for (const containerId of containerIds) {
    const arrangement = arrangements.get(containerId);
    if (!arrangement) continue;
    encoded[containerId] = {
      width: arrangement.width,
      places: Object.fromEntries(
        Array.from(arrangement.slots, ([childId, slot]) => [childId, [slot.x, slot.z, slot.width, slot.depth]])
      ),
    };
  }
  return encoded;
}

function sendArrangements(room: CollaborationRoom, arrangements: Arrangements, containerIds: Iterable<string>) {
  for (const chunk of layoutArrangementChunks(encodeArrangements(arrangements, containerIds))) {
    room.send('layoutArrangement', { containers: chunk });
  }
}

/**
 * The layouter changed its own places. In a Room the Host's changes become
 * the Room's: after a fresh packing the Room forgets its places first.
 */
export function layoutArrangementChanged() {
  const changes = takeArrangementChanges();
  const room = currentRoom();
  if (!changes || !room?.state.hostId || !isHostOf(room)) return;
  if (changes.reset) room.send('layoutRecompute', {});
  if (changes.changed.size > 0) sendArrangements(room, changes.arrangements, changes.changed);
}

/* For rendering and the controls */

/** Whether someone else decides the layout: in a Room, for everyone but the Host. */
export function useLayoutDecidedByHost(): boolean {
  const inRoom = useInRoom();
  const hostId = useRoomStatePart('hostId');
  const sessionId = useRoomConnectionStore((state) => state.room?.sessionId);
  return inRoom && !!hostId && hostId !== sessionId;
}

/** The Room's layout, which changes whenever the Host's options or places do; undefined while alone. */
export function useRoomLayout() {
  return useRoomStatePart('layout');
}

/** The user asked for a fresh layout. In a Room only the Host may; it then packs afresh for everyone. */
export function requestLayoutRecompute() {
  if (roomDecidedByHost()) return;
  useLayoutStore.getState().recomputeLayout();
}

registerHandOver({
  startingState: () => ({ layoutOptions: encodeOptions(ownSettings()) }),
  enter: (room, entry) => {
    decodedRoomArrangements.drop();
    let wasHost = entry === 'created';
    if (wasHost) {
      // The creator's places become the Room's; they may not fit into the join request.
      const own = peekOwnArrangements();
      if (own) sendArrangements(room, own, own.keys());
    } else {
      // From now on the Room's places are shown; the own ones have no home.
      resetMaxRectsLayout();
    }
    lastSentOptions = undefined;
    const follow = (state: CollaborationRoom['state']) => {
      if (!state.hostId) return;
      const isHost = state.hostId === room.sessionId;
      if (!isHost) {
        applyRoomOptions(room);
      } else if (!wasHost) {
        // The Host right passed to us: carry on from the Room's places.
        adoptArrangements(fromDecoded(state.layout?.arrangement));
      }
      wasHost = isHost;
    };
    // The Room's state may have arrived already, or arrives later.
    follow(room.state);
    room.onStateChange(follow);
  },
  leave: (lastState) => {
    // The Host's own places are the Room's; anyone else carries on with the Room's.
    const room = currentRoom();
    if (room && !isHostOf(room)) adoptArrangements(fromDecoded(lastState.layout?.arrangement));
    decodedRoomArrangements.drop();
  },
});
