import eventEmitter from 'explorviz-frontend/src/utils/event-emitter';
import { create } from 'zustand';
import { CROSS_COMMIT_IDENTIFIER } from '../utils/evolution-schemes/evolution-data';
import { Timestamp } from '../utils/landscape-schemes/timestamp';

export const NEW_SELECTED_TIMESTAMP_EVENT = 'new_selected_timestamp';

interface TimestampState {
  timestamp: Map<string, bigint[]>;
  commitToSelectedTimestamps: Map<string, Timestamp[]>;
  getLatestTimestampByCommitOrFallback: (commit: string) => bigint;
  updateSelectedTimestamp: (timestamp: Map<string, bigint[]>) => void;
  setSelectedTimestamps: (newTimestamps: Timestamp[], commit?: string) => void;
  setAllSelectedTimestamps: (
    commitToSelectedTimestamps: Map<string, Timestamp[]>
  ) => void;
  resetSelectedTimestamps: () => void;
  resetState: () => void;
}

export const useTimestampStore = create<TimestampState>((set, get) => ({
  timestamp: new Map(), // tracked
  commitToSelectedTimestamps: new Map(),

  getLatestTimestampByCommitOrFallback: (commit: string): bigint => {
    let returnValue;

    const latestTimestampsForCommit = get().timestamp.get(commit) ?? [];

    for (const selectedTimestamp of latestTimestampsForCommit) {
      if (!returnValue) {
        returnValue = selectedTimestamp;
      } else {
        if (selectedTimestamp > returnValue) {
          returnValue = selectedTimestamp;
        }
      }
    }

    if (
      !returnValue &&
      get().timestamp.size > 0 &&
      get().timestamp.values().next()
    ) {
      // this is the case when only dynamic is being visualized

      returnValue = get().timestamp.values().next().value![0];
    }

    return returnValue!;
  },

  updateSelectedTimestamp: (timestamp: Map<string, bigint[]>) => {
    set({ timestamp: timestamp });
    eventEmitter.emit(NEW_SELECTED_TIMESTAMP_EVENT, get().timestamp);
  },

  setSelectedTimestamps: (
    newTimestamps: Timestamp[],
    commit = CROSS_COMMIT_IDENTIFIER
  ) => {
    set((state) => ({
      commitToSelectedTimestamps: new Map(state.commitToSelectedTimestamps).set(
        commit,
        newTimestamps
      ),
    }));
  },

  setAllSelectedTimestamps: (
    commitToSelectedTimestamps: Map<string, Timestamp[]>
  ) => set({ commitToSelectedTimestamps: commitToSelectedTimestamps }),

  resetSelectedTimestamps: () => set({ commitToSelectedTimestamps: new Map() }),

  resetState: () =>
    set({ timestamp: new Map(), commitToSelectedTimestamps: new Map() }),
}));
