import { useRoomConnectionStore, useRoomState } from 'explorviz-frontend/src/utils/collaboration/room-connection';
import type {
  CameraPose,
  ClientMessages,
  ServerMessages,
} from 'explorviz-frontend/src/utils/collaboration/room-contract.generated';

/*
 * Spectating: following another Participant's camera. Who spectates whom is
 * Room state (each Participant's `spectating`); the camera itself travels as
 * messages that the service forwards only to the spectators.
 */

const send = <K extends keyof ClientMessages>(type: K, payload: ClientMessages[K]) =>
  useRoomConnectionStore.getState().room?.send(type, payload);

/** Asks the service to let you follow this Participant's camera. */
export function spectate(sessionId: string) {
  send('spectate', { target: sessionId });
}

/** Asks the service to end your spectating. */
export function stopSpectating() {
  send('spectate', { target: null });
}

/** Sends your camera to your spectators. */
export function sendCamera(pose: CameraPose) {
  send('camera', pose);
}

export type SpectatingView = {
  /** The session id of the Participant you follow, or undefined. */
  target: string | undefined;
  /** The session ids of the Participants who follow you. */
  spectators: string[];
};

const ALONE: SpectatingView = { target: undefined, spectators: [] };

/** Whom you spectate and who spectates you; nobody while exploring alone. */
export function useSpectating(): SpectatingView {
  const room = useRoomConnectionStore((state) => state.room);
  const state = useRoomState();
  if (!room || !state) return ALONE;
  const participants = Object.entries(state.participants);
  return {
    target: state.participants[room.sessionId]?.spectating || undefined,
    spectators: participants.filter(([, p]) => p.spectating === room.sessionId).map(([id]) => id),
  };
}

/*
 * The latest camera received per spectated Participant. It changes every
 * frame, so it is kept out of React and read in the render loop.
 */
const latestCameras = new Map<string, CameraPose>();
let stopListening: (() => void) | undefined;

useRoomConnectionStore.subscribe((state, previous) => {
  if (state.room === previous.room) return;
  stopListening?.();
  stopListening = undefined;
  latestCameras.clear();
  stopListening = state.room?.onMessage('camera', (message: ServerMessages['camera']) => {
    const { from, ...pose } = message;
    latestCameras.set(from, pose);
  });
});

/** The last camera the service forwarded from this Participant, if any. */
export function latestCameraOf(sessionId: string): CameraPose | undefined {
  return latestCameras.get(sessionId);
}
