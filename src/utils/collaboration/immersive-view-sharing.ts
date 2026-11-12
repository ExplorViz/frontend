import { useImmersiveViewStore } from 'explorviz-frontend/src/stores/immersive-view-store';
import { useRoomConnectionStore, useRoomState } from 'explorviz-frontend/src/utils/collaboration/room-connection';
import { useEffect } from 'react';

/*
 * The immersive-view indicator: which entity each Participant views
 * immersively is Room state (`immersiveEntityId`), set by that Participant.
 */

/** Keeps the Room informed about the entity you view immersively. */
export function useShareImmersiveView() {
  const room = useRoomConnectionStore((state) => state.room);
  const recorded = useRoomState()?.participants[room?.sessionId ?? '']?.immersiveEntityId;
  const entityId = useImmersiveViewStore((state) => state.activeMeshId);

  useEffect(() => {
    if (!room || recorded === undefined || recorded === (entityId ?? '')) return;
    room.send('immersive', { entityId: entityId ?? null });
  }, [room, recorded, entityId]);
}

export type RemoteImmersiveView = { sessionId: string; entityId: string; color: string };

/** The immersive views of the other Participants in the Room. */
export function useRemoteImmersiveViews(): RemoteImmersiveView[] {
  const room = useRoomConnectionStore((state) => state.room);
  const state = useRoomState();
  if (!room || !state) return [];
  return Object.entries(state.participants)
    .filter(([sessionId, p]) => sessionId !== room.sessionId && p.immersiveEntityId)
    .map(([sessionId, p]) => ({ sessionId, entityId: p.immersiveEntityId, color: p.color }));
}
