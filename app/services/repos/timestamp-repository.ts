import Service from '@ember/service';

import Evented from '@ember/object/evented';
import debugLogger from 'ember-debug-logger';
import { Timestamp } from 'explorviz-frontend/utils/landscape-schemes/timestamp';

/**
 * Handles all landscape-related timestamps within the application, especially for the timelines
 *
 * @class Timestamp-Repository-Service
 * @extends Ember.Service
 */
export default class TimestampRepository extends Service.extend(Evented) {
  debug = debugLogger('TimestampRepository');

  private timelineTimestamps: Map<number, Timestamp> = new Map();

  getNextTimestampOrLatest(epochMilli: number): Timestamp | undefined {
    if (this.timelineTimestamps) {
      let isNextTimestamp: boolean = false;
      for (const [, value] of this.timelineTimestamps.entries()) {
        if (isNextTimestamp) {
          return value;
        } else if (epochMilli === value.epochMilli) {
          isNextTimestamp = true;
        }
      }
      const values = [...this.timelineTimestamps.values()];
      return values[values.length - 1];
    }
    return undefined;
  }

  getTimestamps(): Timestamp[] {
    if (this.timelineTimestamps) {
      return [...this.timelineTimestamps.values()];
    } else {
      return [];
    }
  }

  getLatestTimestamp() {
    if (this.timelineTimestamps) {
      const timestampSetAsArray = [...this.timelineTimestamps.values()];
      return timestampSetAsArray[timestampSetAsArray.length - 1];
    }

    return undefined;
  }

  addTimestamps(timestamps: Timestamp[]) {
    for (const timestamp of timestamps) {
      this.addTimestamp(timestamp);
    }
    if (timestamps) {
      this.timelineTimestamps = new Map(
        [...this.timelineTimestamps.entries()].sort()
      );
    }
  }

  private addTimestamp(timestamp: Timestamp) {
    if (this.timelineTimestamps) {
      this.timelineTimestamps.set(timestamp.epochMilli, timestamp);
    } else {
      const newTimestampMap = new Map<number, Timestamp>();
      newTimestampMap.set(timestamp.epochMilli, timestamp);
      this.timelineTimestamps = newTimestampMap;
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
