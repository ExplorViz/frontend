import { createStore } from "zustand/vanilla";
import { Timestamp } from "react-lib/src/utils/landscape-schemes/timestamp";
// import TimelineDataObjectHandler from 'explorviz-frontend/utils/timeline/timeline-data-object-handler';

interface TimestampState {
  commitToTimestampMap: Map<string, Map<number, Timestamp>>;
  addCommitToTimestamp: (commitId: string, timestamps: Map<number, Timestamp>) => void;
//   _timelineDataObjectHandler: TimelineDataObjectHandler | null;
}

export const useTimestampStore = createStore<TimestampState>(() => ({
  commitToTimestampMap: new Map(),
  addCommitToTimestamp,
//   _timelineDataObjectHandler: null,
}));

function addCommitToTimestamp(commitId: string, timestamps: Map<number, Timestamp>){
  useTimestampStore.setState((prev) => ({
    commitToTimestampMap: new Map(prev.commitToTimestampMap).set(commitId, timestamps)
  }));
}