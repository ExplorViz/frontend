import Service from '@ember/service';

import Evented from '@ember/object/evented';
import debugLogger from 'ember-debug-logger';

export interface Timestamp {
  id: string,
  timestamp: number,
  totalRequests: number,
}

/**
* Handles all landscape-related timestamps within the application, especially for the timelines
*
* @class Timestamp-Repository-Service
* @extends Ember.Service
*/
export default class TimestampRepository extends Service.extend(Evented) {
  debug = debugLogger();

  private timelineTimestamps: Map<string, Timestamp[]> = new Map();

  getTimestamps(landscapeToken: string) {
    return this.timelineTimestamps.get(landscapeToken);
  }

  getLatestTimestamp(landscapeToken: string) {
    const timestamps = this.getTimestamps(landscapeToken);
    if (timestamps) {
      return timestamps[timestamps.length - 1];
    }

    return undefined;
  }

  addTimestamp(landscapeToken: string, timestamp: Timestamp) {
    const timestamps = this.timelineTimestamps.get(landscapeToken);
    if (timestamps) {
      this.timelineTimestamps.set(landscapeToken, [...timestamps, timestamp]);
    } else {
      this.timelineTimestamps.set(landscapeToken, [timestamp]);
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
