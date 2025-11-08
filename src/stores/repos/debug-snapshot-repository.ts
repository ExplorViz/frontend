import { Timestamp } from "explorviz-frontend/src/utils/landscape-schemes/timestamp";
import { create } from "zustand";

export type DebugSnapshot = {
  timestamp: Timestamp;
};

interface DebugSnapshotRepositoryState {
landscapeTokenToDebugSnapshotMap: Map<string, Map<number, DebugSnapshot>>; // landscapeToken -> (timestamp.epochMilli -> DebugSnapshot)

  saveDebugSnapshots: (
    landscapeToken: string,
    debugSnapshots: DebugSnapshot[]
  ) => void;

  saveDebugSnapshot: (
    landscapeToken: string,
    debugSnapshot: DebugSnapshot
  ) => void;

  getDebugSnapshotsByLandscapeToken: (landscapeToken: string) => DebugSnapshot[] | undefined;

  getDebugSnapshotByLandscapeTokenAndTimestamp: (
    landscapeToken: string,
    timestamp: number
  ) => DebugSnapshot | undefined;
}

export const useDebugSnapshotRepositoryStore = create<DebugSnapshotRepositoryState>(
  (set, get) => ({
    landscapeTokenToDebugSnapshotMap: new Map(), // tracked

    saveDebugSnapshots:(landscapeToken: string, debugSnapshots: DebugSnapshot[]) => {
      for (const snapshot of debugSnapshots) {
        get().saveDebugSnapshot(landscapeToken, snapshot);
      }
    },
    saveDebugSnapshot: (
      landscapeToken: string,
      debugSnapshot: DebugSnapshot) => {
      const outerMap = get().landscapeTokenToDebugSnapshotMap;
      const snapshots = outerMap.get(landscapeToken) ?? new Map<number, DebugSnapshot>();

      snapshots.set(debugSnapshot.timestamp.epochMilli, debugSnapshot);
      outerMap.set(landscapeToken, snapshots);
    },

    getDebugSnapshotsByLandscapeToken: (landscapeToken: string) => {
      const snapshotsMap = get().landscapeTokenToDebugSnapshotMap.get(landscapeToken);
      return snapshotsMap ? Array.from(snapshotsMap.values()) : [];
    },

    getDebugSnapshotByLandscapeTokenAndTimestamp: (landscapeToken: string, epochMilli: number) => {
      return get().landscapeTokenToDebugSnapshotMap.get(landscapeToken)?.get(epochMilli);
    },
  })
);
