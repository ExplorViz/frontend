import { useRoomSerializerStore } from 'explorviz-frontend/src/stores/collaboration/room-serializer';
import { useSnapshotTokenStore } from 'explorviz-frontend/src/stores/snapshot-token';
import { registerHandOver, useRoomConnectionStore } from 'explorviz-frontend/src/utils/collaboration/room-connection';
import { create } from 'zustand';

/*
 * Snapshots and Rooms. Saving a Snapshot needs nothing from here: the
 * serializer reads every capability through its module, so it saves what the
 * person sees. Opening a Snapshot is never done in a Room: the person is asked
 * to leave first, and nothing of a Snapshot is loaded into a Room. A Room
 * created after opening a Snapshot starts from it like from any own state.
 * Entering a Room (created or joined) closes an open Snapshot: in a Room
 * everyone is on the live Landscape.
 */

type LeaveQuestion = {
  /** Set while the person is asked whether to leave the Room for a Snapshot. */
  answer?: (leave: boolean) => void;
};

export const useLeaveForSnapshotStore = create<LeaveQuestion>(() => ({}));

/**
 * Call before opening a Snapshot. Alone, resolves to true at once. In a Room,
 * asks the person to leave it (see `LeaveRoomForSnapshotNotice`) and resolves
 * to true once they have left, or to false if they stay.
 */
export function leaveRoomToOpenSnapshot(): Promise<boolean> {
  if (!useRoomConnectionStore.getState().room) return Promise.resolve(true);
  // A question still open is answered with "stay": only the latest Snapshot is opened.
  useLeaveForSnapshotStore.getState().answer?.(false);
  return new Promise((resolve) => {
    const answer = async (leave: boolean) => {
      if (useLeaveForSnapshotStore.getState().answer === answer)
        useLeaveForSnapshotStore.setState({ answer: undefined });
      if (leave) await useRoomConnectionStore.getState().leaveRoom();
      resolve(leave && !useRoomConnectionStore.getState().room);
    };
    useLeaveForSnapshotStore.setState({ answer });
  });
}

/** False in a Room: a Snapshot is only ever applied to the own state. */
export function canApplySnapshot() {
  return !useRoomConnectionStore.getState().room;
}

const snapshotClosedListeners = new Set<() => void>();

/**
 * Calls the listener whenever entering a Room closed an open Snapshot, so the
 * view loads the live Landscape instead of the Snapshot's frozen data.
 * Returns a function that stops listening.
 */
export function onSnapshotClosedForRoom(listener: () => void) {
  snapshotClosedListeners.add(listener);
  return () => {
    snapshotClosedListeners.delete(listener);
  };
}

registerHandOver({
  enter: () => {
    // A Snapshot still waiting for its Landscape data must not be applied in the Room.
    useRoomSerializerStore.getState().setSerializedRoom(undefined);
    // Creating, the Room started from the open Snapshot; from now on it is the Room's state that counts.
    if (!useSnapshotTokenStore.getState().snapshotSelected) return;
    useSnapshotTokenStore.setState({ snapshotSelected: false, snapshotToken: null });
    for (const listener of [...snapshotClosedListeners]) listener();
  },
});
