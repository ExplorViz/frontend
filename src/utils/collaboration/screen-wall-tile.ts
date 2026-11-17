import { useRoomConnectionStore, useRoomState } from 'explorviz-frontend/src/utils/collaboration/room-connection';
import type { ScreenWallTileConfig } from 'explorviz-frontend/src/utils/collaboration/room-contract.generated';
import { useEffect } from 'react';

/** Your own Tile while the Screen Wall is active and you are one: its number (1-based) and whether you are the Host. */
export type OwnTile = { number: number; isHost: boolean };

/**
 * Your own Tile's index, the wall's Tiles and the Host's Tile index (-1 if the
 * Host has none) while the Screen Wall is active and you are a Tile, else undefined.
 */
export function useOwnTileIndex(): { index: number; tiles: ScreenWallTileConfig[]; hostTile: number } | undefined {
  const room = useRoomConnectionStore((state) => state.room);
  const state = useRoomState();
  if (!room || !state?.screenWall?.active) return undefined;
  const index = state.participants[room.sessionId]?.tile ?? -1;
  const { tiles } = state.screenWall;
  const hostTile = state.participants[state.hostId]?.tile ?? -1;
  return index >= 0 && index < tiles.length ? { index, tiles, hostTile } : undefined;
}

export function useOwnTile(): OwnTile | undefined {
  const room = useRoomConnectionStore((state) => state.room);
  const hostId = useRoomState()?.hostId;
  const own = useOwnTileIndex();
  if (!own) return undefined;
  return { number: own.index + 1, isHost: !!room && hostId === room.sessionId };
}

/** Whether you may enter VR or AR: not as a Tile of the Screen Wall, which renders in the browser only. */
export function useXrAllowed(): boolean {
  return !useOwnTileIndex();
}

/** Whether you are the Host of an active Screen Wall, whose Tiles follow your camera. */
export function useDrivesScreenWall(): boolean {
  const room = useRoomConnectionStore((state) => state.room);
  const state = useRoomState();
  return !!room && !!state?.screenWall.active && state.hostId === room.sessionId;
}

/** Calls the listener whenever the Host asks every Tile to show its number. */
export function useOnScreenWallIdentify(listener: () => void) {
  const room = useRoomConnectionStore((state) => state.room);
  useEffect(() => room?.onMessage('screenWallIdentify', () => listener()), [room, listener]);
}
