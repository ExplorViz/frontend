import * as THREE from 'three';
import { create } from 'zustand';
import { useRoomConnectionStore, useRoomState } from 'explorviz-frontend/src/utils/collaboration/room-connection';
import type {
  ClientMessages,
  Presence,
  ServerMessages,
} from 'explorviz-frontend/src/utils/collaboration/room-contract.generated';

/*
 * Presence: where each Participant's camera is and the point it looks at,
 * shown to the others as a marker in the Participant's color. It travels as
 * messages that the service passes to everyone else; nothing is Room state.
 * Whether you see the others' markers is your own choice, remembered in the
 * browser; it does not change what you share.
 */

/** Sends your Presence to the other Participants. */
export function sendPresence(presence: Presence) {
  useRoomConnectionStore.getState().room?.send('presence', presence satisfies ClientMessages['presence']);
}

/**
 * Whether you share your Presence now: while others are in the Room with you
 * and you do not spectate (your camera then is someone else's).
 */
export function useSharesPresence(): boolean {
  const room = useRoomConnectionStore((state) => state.room);
  const state = useRoomState();
  if (!room || !state) return false;
  const own = state.participants[room.sessionId];
  return !!own && !own.spectating && Object.keys(state.participants).length > 1;
}

/** Changes whenever somebody joins or leaves, so that everyone sends their Presence again at once. */
export function useParticipantsKey(): string {
  const state = useRoomState();
  return state ? Object.keys(state.participants).join(' ') : '';
}

export type ShownPresence = { sessionId: string; color: string };

/**
 * The Participants whose marker you see: everyone else, unless you switched
 * the markers off. Left out are those who spectate (they look through
 * someone else's camera), those in an immersive view (shown by their
 * immersive-view indicator), and the one you spectate (you look through
 * their camera).
 */
export function useShownPresences(): ShownPresence[] {
  const room = useRoomConnectionStore((state) => state.room);
  const state = useRoomState();
  const shown = useShowParticipantsStore((settings) => settings.showParticipants);
  if (!room || !state || !shown) return [];
  const ownTarget = state.participants[room.sessionId]?.spectating;
  return Object.entries(state.participants)
    .filter(
      ([sessionId, p]) =>
        sessionId !== room.sessionId && sessionId !== ownTarget && !p.spectating && !p.immersiveEntityId
    )
    .map(([sessionId, p]) => ({ sessionId, color: p.color }));
}

/*
 * The Presences received per Participant, newest last, each with the time it
 * arrived. They change every frame, so they are kept out of React and read in
 * the render loop.
 */
type ReceivedPresence = { at: number; presence: Presence };
const received = new Map<string, ReceivedPresence[]>();
const KEPT_PRESENCES = 4;
let stopListening: (() => void) | undefined;

useRoomConnectionStore.subscribe((state, previous) => {
  if (state.room === previous.room) return;
  stopListening?.();
  stopListening = undefined;
  received.clear();
  stopListening = state.room?.onMessage('presence', (message: ServerMessages['presence']) => {
    const { from, position, target } = message;
    const presences = received.get(from) ?? [];
    presences.push({ at: performance.now(), presence: { position, target } });
    if (presences.length > KEPT_PRESENCES) presences.shift();
    received.set(from, presences);
  });
});

/**
 * How far behind `smoothPresenceOf` shows a Participant, so that there is a
 * next Presence to move towards: a little more than the time between two.
 */
export const PRESENCE_SMOOTHING_DELAY_MS = 150;

/**
 * Puts this Participant's camera position and look target as received
 * PRESENCE_SMOOTHING_DELAY_MS ago into `position` and `target`, interpolated
 * between the Presences around then. Returns false if none came.
 */
export function smoothPresenceOf(sessionId: string, position: THREE.Vector3, target: THREE.Vector3): boolean {
  const presences = received.get(sessionId);
  if (!presences?.length) return false;
  const time = performance.now() - PRESENCE_SMOOTHING_DELAY_MS;
  const next = presences.findIndex(({ at }) => at > time);
  if (next <= 0) {
    const { presence } = next === 0 ? presences[0] : presences[presences.length - 1];
    position.fromArray(presence.position);
    target.fromArray(presence.target);
    return true;
  }
  const from = presences[next - 1];
  const to = presences[next];
  const t = (time - from.at) / (to.at - from.at);
  position.fromArray(from.presence.position).lerp(towards.fromArray(to.presence.position), t);
  target.fromArray(from.presence.target).lerp(towards.fromArray(to.presence.target), t);
  return true;
}

const towards = new THREE.Vector3();

const SHOW_PARTICIPANTS_KEY = 'explorviz.collaboration.showParticipants';

function readShowParticipants(): boolean {
  try {
    return localStorage.getItem(SHOW_PARTICIPANTS_KEY) !== 'false';
  } catch {
    return true;
  }
}

type ShowParticipantsState = {
  /** Whether you see the other Participants' markers; on unless you switched them off. */
  showParticipants: boolean;
  setShowParticipants: (show: boolean) => void;
};

/** Your choice whether to see the other Participants' markers, remembered in the browser. */
export const useShowParticipantsStore = create<ShowParticipantsState>((set) => ({
  showParticipants: readShowParticipants(),
  setShowParticipants: (show) => {
    set({ showParticipants: show });
    try {
      localStorage.setItem(SHOW_PARTICIPANTS_KEY, String(show));
    } catch {
      // The choice then holds only until the page is reloaded.
    }
  },
}));
