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
  debug = debugLogger();

  private timelineTimestamps: Map<string, Map<number, Timestamp>> = new Map();

  getNextTimestampOrLatest(
    landscapeToken: string,
    commitId: string,
    epochMilli: number
  ): Timestamp | undefined {
    const timestampsForLandscapetoken =
      this.timelineTimestamps.get(landscapeToken + "_" + commitId);
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

  getTimestamps(landscapeToken: string, commitId: string): Timestamp[] {
    const timestampsForLandscapetokenAndCommitId =
      this.timelineTimestamps.get(landscapeToken + "_" + commitId);
    if (timestampsForLandscapetokenAndCommitId) {
      return [...timestampsForLandscapetokenAndCommitId.values()];
    } else {
      return [];
    }
  }

  getLatestTimestamp(landscapeToken: string, commitId: string) {
    const timestamps = this.getTimestamps(landscapeToken, commitId);
    if (timestamps) {
      const timestampSetAsArray = [...timestamps];
      return timestampSetAsArray[timestampSetAsArray.length - 1];
    }

    return undefined;
  }

  addTimestamps(landscapeToken: string, commitId: string, timestamps: Timestamp[]) {
    for (const timestamp of timestamps) {
      this.addTimestamp(landscapeToken, commitId, timestamp);
    }
    if (timestamps) {
      this.timelineTimestamps = new Map(
        [...this.timelineTimestamps.entries()].sort()
      );
    }
  }

  private addTimestamp(landscapeToken: string, commitId: string, timestamp: Timestamp) {
    const timestamps = this.timelineTimestamps.get(landscapeToken + "_" + commitId);

    if (timestamps) {
      timestamps.set(timestamp.epochMilli, timestamp);
    } else {
      const newTimestampMap = new Map<number, Timestamp>();
      newTimestampMap.set(timestamp.epochMilli, timestamp);
      this.timelineTimestamps.set(landscapeToken + "_" + commitId, newTimestampMap);
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
