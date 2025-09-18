import { TIMESTAMP_UPDATE_EVENT } from 'explorviz-frontend/src/utils/collaboration/web-socket-messages/sendable/timestamp-update';
import eventEmitter from 'explorviz-frontend/src/utils/event-emitter';
import { create } from 'zustand';

export const NEW_SELECTED_TIMESTAMP_EVENT = 'new_selected_timestamp';

interface TimestampState {
  timestamp: Map<string, number[]>;
  getLatestTimestampByCommitOrFallback: (commit: string) => number;
  updateSelectedTimestamp: (timestamp: Map<string, number[]>) => void;
  updateTimestampFromVr: (timestamp: number) => void;
  resetState: () => void;
}

export const useTimestampStore = create<TimestampState>((set, get) => ({
  timestamp: new Map(), // tracked

  getLatestTimestampByCommitOrFallback: (commit: string): number => {
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

  updateSelectedTimestamp: (timestamp: Map<string, number[]>) => {
    set({ timestamp: timestamp });
    eventEmitter.emit(NEW_SELECTED_TIMESTAMP_EVENT, get().timestamp);
  },

  // TODO not the best solution, should be handled differently
  updateTimestampFromVr: (timestamp: number) => {
    eventEmitter.emit(TIMESTAMP_UPDATE_EVENT, {
      originalMessage: { timestamp },
    });
  },

  resetState: () => {
    set({ timestamp: new Map() });
  },
}));
