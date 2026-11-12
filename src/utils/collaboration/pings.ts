import { useRoomConnectionStore } from 'explorviz-frontend/src/utils/collaboration/room-connection';
import type { Ping, ServerMessages } from 'explorviz-frontend/src/utils/collaboration/room-contract.generated';

/*
 * Pings, as one collaboration module. A ping is a message, never state: in a
 * Room it goes to the service, which passes it to the other Participants and
 * writes its chat entry. Alone, nothing is sent.
 */

export type { Ping };

/** Another Participant's ping, in their color. */
export type ReceivedPing = ServerMessages['ping'];

/** Shares a ping you made with the Room, if you are in one. */
export function sharePing(ping: Ping) {
  useRoomConnectionStore.getState().room?.send('ping', ping);
}

/** Your Participant color while in a Room; undefined alone. */
export function ownPingColor(): string | undefined {
  const room = useRoomConnectionStore.getState().room;
  const participants = (room?.state as { participants?: Map<string, { color: string }> } | undefined)?.participants;
  return room ? participants?.get(room.sessionId)?.color : undefined;
}

const listeners = new Set<(ping: ReceivedPing) => void>();
let stopListening: (() => void) | undefined;

useRoomConnectionStore.subscribe((state, previous) => {
  if (state.room === previous.room) return;
  stopListening?.();
  stopListening = state.room?.onMessage('ping', (ping: ReceivedPing) => {
    for (const listener of [...listeners]) listener(ping);
  });
});

/** Calls the listener for every ping of another Participant of the Room. Returns how to stop. */
export function onPingReceived(listener: (ping: ReceivedPing) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
