import Service from '@ember/service';

import Evented from '@ember/object/evented';
import debugLogger from 'ember-debug-logger';
import { Timestamp } from 'some-react-lib/src/utils/landscape-schemes/timestamp';

/**
 * Handles all landscape-related timestamps within the application, especially for the timelines
 *
 * @class Timestamp-Repository-Service
 * @extends Ember.Service
 */
export default class TimestampRepository extends Service.extend(Evented) {
  debug = debugLogger();

  private timelineTimestamps: Map<string, Map<number, Timestamp>> = new Map();

  getNextTimestampOrLatest(
    landscapeToken: string,
    epochMilli: number
  ): Timestamp | undefined {
    const timestampsForLandscapetoken =
      this.timelineTimestamps.get(landscapeToken);
    if (timestampsForLandscapetoken) {
      let isNextTimestamp: boolean = false;
      for (const [, value] of timestampsForLandscapetoken.entries()) {
        if (isNextTimestamp) {
          return value;
        } else if (epochMilli === value.epochMilli) {
          isNextTimestamp = true;
        }
      }
      const values = [...timestampsForLandscapetoken.values()];
      return values[values.length - 1];
    }
    return undefined;
  }

  getTimestamps(landscapeToken: string): Timestamp[] {
    const timestampsForLandscapetoken =
      this.timelineTimestamps.get(landscapeToken);
    if (timestampsForLandscapetoken) {
      return [...timestampsForLandscapetoken.values()];
    } else {
      return [];
    }
  }

  getLatestTimestamp(landscapeToken: string) {
    const timestamps = this.getTimestamps(landscapeToken);
    if (timestamps) {
      const timestampSetAsArray = [...timestamps];
      return timestampSetAsArray[timestampSetAsArray.length - 1];
    }

    return undefined;
  }

  addTimestamps(landscapeToken: string, timestamps: Timestamp[]) {
    for (const timestamp of timestamps) {
      this.addTimestamp(landscapeToken, timestamp);
    }
    if (timestamps) {
      this.timelineTimestamps = new Map(
        [...this.timelineTimestamps.entries()].sort()
      );
    }
  }

  private addTimestamp(landscapeToken: string, timestamp: Timestamp) {
    const timestamps = this.timelineTimestamps.get(landscapeToken);

    if (timestamps) {
      timestamps.set(timestamp.epochMilli, timestamp);
    } else {
      const newTimestampMap = new Map<number, Timestamp>();
      newTimestampMap.set(timestamp.epochMilli, timestamp);
      this.timelineTimestamps.set(landscapeToken, newTimestampMap);
    }
  }

  /**
   * Triggers the 'updated' event in the timeline for updating the chart
   * @method triggerTimelineUpdate
   */
  triggerTimelineUpdate() {
    this.trigger('updated');
  }
}

declare module '@ember/service' {
  interface Registry {
    'repos/timestamp-repository': TimestampRepository;
  }
}
