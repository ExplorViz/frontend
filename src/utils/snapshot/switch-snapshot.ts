import { TinySnapshot } from 'explorviz-frontend/src/stores/snapshot-token';
import { leaveRoomToOpenSnapshot } from 'explorviz-frontend/src/utils/collaboration/snapshots';

/** Which Snapshot to show instead of the current view; null shows the Landscape's live data. */
export type SnapshotSwitch = { snapshot: TinySnapshot; isShared: boolean } | null;

const switchListeners = new Set<(target: SnapshotSwitch) => void>();

/**
 * Calls the listener whenever another Snapshot (or the live Landscape) is to be
 * shown while the visualization stays open. Returns a function that stops listening.
 */
export function onSnapshotSwitch(listener: (target: SnapshotSwitch) => void) {
  switchListeners.add(listener);
  return () => {
    switchListeners.delete(listener);
  };
}

/**
 * Shows the given Snapshot in the open visualization, or the live Landscape for null.
 * In a Room, the person is asked to leave it first; resolves to false if they stay.
 */
export async function switchSnapshot(target: SnapshotSwitch): Promise<boolean> {
  if (target && !(await leaveRoomToOpenSnapshot())) return false;
  for (const listener of [...switchListeners]) listener(target);
  return true;
}
