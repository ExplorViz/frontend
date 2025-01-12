import Service from '@ember/service';
import Evented from '@ember/object/evented';
import { TIMESTAMP_UPDATE_EVENT } from 'react-lib/src/utils/collaboration/web-socket-messages/sendable/timestamp-update';
import { useTimestampStore } from 'react-lib/src/stores/timestamp';

export const NEW_SELECTED_TIMESTAMP_EVENT = 'new_selected_timestamp';

export default class TimestampService extends Service.extend(Evented) {
  // @tracked
  // timestamp: Map<string, number[]> = new Map();

  get timestamp(): Map<string, number[]> {
    return useTimestampStore.getState().timestamp;
  }

  set timestamp(value: Map<string, number[]>) {
    useTimestampStore.setState({ timestamp: value });
  }

  getLatestTimestampByCommitOrFallback(commit: string): number {
    let returnValue;

    const latestTimestampsForCommit = this.timestamp.get(commit) ?? [];

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
      this.timestamp.size > 0 &&
      this.timestamp.values().next()
    ) {
      // this is the case when only dynamic is being visualized

      returnValue = this.timestamp.values().next().value[0];
    }

    return returnValue;
  }

  updateSelectedTimestamp(timestamp: Map<string, number[]>) {
    this.timestamp = timestamp;
    this.trigger(NEW_SELECTED_TIMESTAMP_EVENT, this.timestamp);
  }

  // TODO not the best solution, should be handled differently
  updateTimestampFromVr(timestamp: number) {
    this.trigger(TIMESTAMP_UPDATE_EVENT, { originalMessage: { timestamp } });
  }

  resetState() {
    this.timestamp = new Map();
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    timestamp: TimestampService;
  }
}
