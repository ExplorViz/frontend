import Service from '@ember/service';

import Evented from '@ember/object/evented';
import debugLogger from 'ember-debug-logger';
import { Timestamp } from 'explorviz-frontend/utils/landscape-schemes/timestamp';
import { tracked } from '@glimmer/tracking';

/**
 * Handles all landscape-related timestamps within the application, especially for the timelines
 *
 * @class Timestamp-Repository-Service
 * @extends Ember.Service
 */
export default class TimestampRepository extends Service.extend(Evented) {
  debug = debugLogger('TimestampRepository');

  @tracked
  timestamps: Map<number, Timestamp> = new Map();

  getNextTimestampOrLatest(epochMilli: number): Timestamp | undefined {
    if (this.timestamps) {
      let isNextTimestamp: boolean = false;
      for (const [, value] of this.timestamps.entries()) {
        if (isNextTimestamp) {
          return value;
        } else if (epochMilli === value.epochMilli) {
          isNextTimestamp = true;
        }
      }
      const values = [...this.timestamps.values()];
      return values[values.length - 1];
    }
    return undefined;
  }

  getLatestTimestamp() {
    if (this.timestamps) {
      const timestampSetAsArray = [...this.timestamps.values()];
      return timestampSetAsArray[timestampSetAsArray.length - 1];
    }

    return undefined;
  }

  addTimestamps(timestamps: Timestamp[]) {
    for (const timestamp of timestamps) {
      this.addTimestamp(timestamp);
    }
    if (timestamps.length) {
      this.timestamps = new Map([...this.timestamps.entries()].sort());
    }
  }

  private addTimestamp(timestamp: Timestamp) {
    if (this.timestamps) {
      this.timestamps.set(timestamp.epochMilli, timestamp);
    } else {
      const newTimestampMap = new Map<number, Timestamp>();
      newTimestampMap.set(timestamp.epochMilli, timestamp);
      this.timestamps = newTimestampMap;
    }
  }
}

declare module '@ember/service' {
  interface Registry {
    'repos/timestamp-repository': TimestampRepository;
  }
}
