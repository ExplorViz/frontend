import { Timestamp } from 'explorviz-frontend/src/utils/landscape-schemes/timestamp';
import { create } from 'zustand';

export type DebugSnapshot = {
  timestamp: Timestamp;
};

interface DebugSnapshotRepositoryState {
  landscapeTokenToDebugSnapshotMap: Map<string, Map<bigint, DebugSnapshot>>; // landscapeToken -> (timestamp.epochMilli -> DebugSnapshot)

  saveDebugSnapshots: (
    landscapeToken: string,
    debugSnapshots: DebugSnapshot[]
  ) => void;

  saveDebugSnapshot: (
    landscapeToken: string,
    debugSnapshot: DebugSnapshot
  ) => void;
}

export const useDebugSnapshotRepositoryStore =
  create<DebugSnapshotRepositoryState>((set, get) => ({
    landscapeTokenToDebugSnapshotMap: new Map(), // tracked

    saveDebugSnapshots: (
      landscapeToken: string,
      debugSnapshots: DebugSnapshot[]
    ) => {
      for (const snapshot of debugSnapshots) {
        get().saveDebugSnapshot(landscapeToken, snapshot);
      }
    },
    saveDebugSnapshot: (
      landscapeToken: string,
      debugSnapshot: DebugSnapshot
    ) => {
      const outerMap = get().landscapeTokenToDebugSnapshotMap;
      const snapshots =
        outerMap.get(landscapeToken) ?? new Map<bigint, DebugSnapshot>();

      snapshots.set(debugSnapshot.timestamp.epochNano, debugSnapshot);
      outerMap.set(landscapeToken, snapshots);
    },
  }));
