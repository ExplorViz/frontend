import * as THREE from 'three';
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
  /** The name of the Participant you follow, or undefined. */
  targetName: string | undefined;
  /** The session ids of the Participants who follow you. */
  spectators: string[];
};

const ALONE: SpectatingView = { target: undefined, targetName: undefined, spectators: [] };

/** Whom you spectate and who spectates you; nobody while exploring alone. */
export function useSpectating(): SpectatingView {
  const room = useRoomConnectionStore((state) => state.room);
  const state = useRoomState();
  if (!room || !state) return ALONE;
  const participants = Object.entries(state.participants);
  const target = state.participants[room.sessionId]?.spectating || undefined;
  return {
    target,
    targetName: target ? state.participants[target]?.name : undefined,
    spectators: participants.filter(([, p]) => p.spectating === room.sessionId).map(([id]) => id),
  };
}

/*
 * The cameras received per spectated Participant, newest last, each with the
 * time it arrived. They change every frame, so they are kept out of React and
 * read in the render loop.
 */
type ReceivedPose = { at: number; pose: CameraPose };
const receivedCameras = new Map<string, ReceivedPose[]>();
/** Enough to span the delay of `smoothCameraOf` even at 60 Hz. */
const KEPT_POSES = 8;
let stopListening: (() => void) | undefined;

useRoomConnectionStore.subscribe((state, previous) => {
  if (state.room === previous.room) return;
  stopListening?.();
  stopListening = undefined;
  receivedCameras.clear();
  stopListening = state.room?.onMessage('camera', (message: ServerMessages['camera']) => {
    const { from, ...pose } = message;
    const poses = receivedCameras.get(from) ?? [];
    poses.push({ at: performance.now(), pose });
    if (poses.length > KEPT_POSES) poses.shift();
    receivedCameras.set(from, poses);
  });
});

/** The last camera the service forwarded from this Participant, if any. */
export function latestCameraOf(sessionId: string): CameraPose | undefined {
  return receivedCameras.get(sessionId)?.at(-1)?.pose;
}

/** How far behind `smoothCameraOf` shows the received camera, so that there is a next pose to move towards. */
export const SMOOTHING_DELAY_MS = 50;

/**
 * Puts into `camera` this Participant's position and orientation as received
 * SMOOTHING_DELAY_MS ago, interpolated between the poses around then (lerp and
 * slerp). Returns the latest pose, for its projection, or undefined if none came.
 */
export function smoothCameraOf(sessionId: string, camera: THREE.Object3D): CameraPose | undefined {
  const poses = receivedCameras.get(sessionId);
  if (!poses?.length) return undefined;
  const time = performance.now() - SMOOTHING_DELAY_MS;
  const next = poses.findIndex(({ at }) => at > time);
  const latest = poses[poses.length - 1].pose;
  if (next <= 0) {
    const { pose } = next === 0 ? poses[0] : poses[poses.length - 1];
    camera.position.fromArray(pose.position);
    camera.quaternion.fromArray(pose.quaternion);
    return latest;
  }
  const from = poses[next - 1];
  const to = poses[next];
  const t = (time - from.at) / (to.at - from.at);
  camera.position.fromArray(from.pose.position).lerp(towards.position.fromArray(to.pose.position), t);
  camera.quaternion.fromArray(from.pose.quaternion).slerp(towards.quaternion.fromArray(to.pose.quaternion), t);
  return latest;
}

const towards = { position: new THREE.Vector3(), quaternion: new THREE.Quaternion() };
