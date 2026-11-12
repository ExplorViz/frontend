import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import {
  registerHandOver,
  useRoomConnectionStore,
  useRoomStatePart,
  type CollaborationRoom,
} from 'explorviz-frontend/src/utils/collaboration/room-connection';
import {
  applyHighlightAction,
  highlightChunks,
  type HighlightAction,
  type HighlightOwners,
  type Participant,
} from 'explorviz-frontend/src/utils/collaboration/room-contract.generated';

/*
 * The collaboration module for highlights.
 *
 * It answers "which entities are highlighted, by whom, in which color?" and
 * accepts "the user did this" for the rest of the frontend, and decides on
 * its own where that state lives: alone it is the person's own state (the
 * highlighted entity ids of the visualization store, which only this module
 * touches), and every highlight is the person's own; in a Room it is the
 * Room's state, read directly from the service and changed only by asking the
 * service. There an entity has at most one highlighter and is shown in their
 * color. Nothing is mirrored between the two; they hand over only when a
 * Room is created, joined or left (see the hand-over at the end).
 */

export type { HighlightAction };

/** Who is the highlighter of the own highlights while alone. */
const ME = 'me';

const currentRoom = () => useRoomConnectionStore.getState().room;

const ownIds = () => useVisualizationStore.getState().highlightedEntityIds;

/** A set of own highlights, seen as highlighter records (all of them the person's). */
const ownOwners = (ids: Set<string>): HighlightOwners => ({
  get: (entityId) => (ids.has(entityId) ? ME : undefined),
  set: (entityId) => ids.add(entityId),
  delete: (entityId) => ids.delete(entityId),
  forEach: (callback) => ids.forEach((entityId) => callback(ME, entityId)),
});

/**
 * The Room's highlighted entities as a Set, one per snapshot of the Room's
 * highlights and of its highlighters' colors, so a reader re-renders when a
 * highlight changes hands or its highlighter changes color, and not otherwise.
 */
let roomIds: { highlights: Record<string, string>; colors: string; ids: Set<string> } | undefined;
function fromRoomSnapshot(highlights: Record<string, string>, participants: Record<string, Participant> | undefined) {
  const colors = Object.values(highlights)
    .map((sessionId) => participants?.[sessionId]?.color)
    .join();
  if (roomIds?.highlights !== highlights || roomIds.colors !== colors) {
    roomIds = { highlights, colors, ids: new Set(Object.keys(highlights)) };
  }
  return roomIds.ids;
}

/** The decoded Room state's highlighted entities; dropped on every state change of the Room. */
let decodedRoomIds: { room: CollaborationRoom; ids: Set<string> } | undefined;
function fromDecodedRoom(room: CollaborationRoom) {
  if (decodedRoomIds?.room !== room) {
    decodedRoomIds = { room, ids: new Set<string>(room.state.highlights?.keys() ?? []) };
  }
  return decodedRoomIds.ids;
}

/** The highlighted entities that are shown, for reading outside of rendering. Treat the set as read-only. */
export function getHighlightedEntityIds(): Set<string> {
  const room = currentRoom();
  return room ? fromDecodedRoom(room) : ownIds();
}

const EMPTY: Record<string, string> = {};

/**
 * The highlighted entities that are shown, for rendering. `select` must
 * return a primitive or the set, not a new object. The set changes when a
 * highlight comes, goes, changes hands or its highlighter's color changes.
 */
export function useHighlights<T>(select: (highlightedEntityIds: Set<string>) => T): T {
  const inRoom = useRoomConnectionStore((state) => state.room !== undefined);
  const own = useVisualizationStore((state) => select(state.highlightedEntityIds));
  const highlights = useRoomStatePart('highlights');
  const participants = useRoomStatePart('participants');
  return inRoom ? select(fromRoomSnapshot(highlights ?? EMPTY, participants)) : own;
}

/** Whether the person highlighted this entity themself (alone: whether it is highlighted). */
export function isOwnHighlight(entityId: string): boolean {
  const room = currentRoom();
  if (!room) return ownIds().has(entityId);
  return room.state.highlights?.get(entityId) === room.sessionId;
}

/**
 * The color of the Participant who highlighted this entity, as a CSS hex
 * color; undefined while alone (own highlights have the color of the
 * settings) or if the entity is not highlighted.
 */
export function highlighterColor(entityId: string): string | undefined {
  const room = currentRoom();
  const sessionId = room?.state.highlights?.get(entityId);
  return sessionId ? room!.state.participants.get(sessionId)?.color : undefined;
}

/** The messages of one action: a bulk highlight is split into chunks far below 4 KB, all but the first `continued`. */
function messages(action: HighlightAction): HighlightAction[] {
  if (action.type !== 'highlightMany') return [action];
  return highlightChunks(action.entityIds).map((entityIds, i) =>
    i === 0 ? { ...action, entityIds } : { type: 'highlightMany', entityIds, continued: true }
  );
}

/**
 * The user did this. Alone it changes the own highlights at once; in a Room
 * it is sent to the service as one message (a long bulk highlight in chunks), and the view follows once the
 * service has applied it. Nothing is sent for an action that would not
 * change the Room's highlights.
 */
export function changeHighlights(action: HighlightAction) {
  const room = currentRoom();
  if (room) {
    const highlights = room.state.highlights;
    const next = new Map<string, string>(highlights?.entries() ?? []);
    applyHighlightAction(next, room.sessionId, action);
    const same = next.size === (highlights?.size ?? 0) && [...next].every(([id, by]) => highlights.get(id) === by);
    if (!same) for (const message of messages(action)) room.send('highlights', message);
    return;
  }
  const next = new Set(ownIds());
  applyHighlightAction(ownOwners(next), ME, action);
  const current = ownIds();
  if (next.size !== current.size || [...next].some((id) => !current.has(id))) {
    useVisualizationStore.setState({ highlightedEntityIds: next });
  }
}

const setOwnIds = (ids: Iterable<string>) => useVisualizationStore.setState({ highlightedEntityIds: new Set(ids) });

registerHandOver({
  startingState: () => ({ highlights: [...ownIds()] }),
  enter: (room) => {
    // From now on the Room's highlights are shown; the own ones have no home.
    // Creating, they became the creator's highlights in the Room.
    setOwnIds([]);
    decodedRoomIds = undefined;
    room.onStateChange(() => {
      if (decodedRoomIds?.room === room) decodedRoomIds = undefined;
    });
  },
  leave: (lastState) => {
    // Everything that was highlighted stays highlighted, as the person's own.
    setOwnIds(lastState.highlights?.keys() ?? []);
    decodedRoomIds = undefined;
  },
});
