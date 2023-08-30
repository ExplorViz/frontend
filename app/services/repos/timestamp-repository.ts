import Service, { inject as service } from '@ember/service';
import Evented from '@ember/object/evented';
import LandscapeDataService, {
  NewTimestampEventName,
} from '../landscape-data-service';

export interface Timestamp {
  id: string;
  timestamp: number;
  totalRequests: number;
}

/**
 * Handles all landscape-related timestamps within the application, especially for the timelines
 *
 * @class Timestamp-Repository-Service
 * @extends Ember.Service
 */
export default class TimestampRepository extends Service.extend(Evented) {
  @service('landscape-data-service')
  private landscapeDataService!: LandscapeDataService;

  private timelineTimestamps: Map<string, Timestamp[]> = new Map();

  init(): void {
    super.init();

    this.landscapeDataService.on(
      NewTimestampEventName,
      this,
      this.onNewTimestamp
    );
  }

  willDestroy(): void {
    this.landscapeDataService.off(
      NewTimestampEventName,
      this,
      this.onNewTimestamp
    );
    super.willDestroy();
  }

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
  private triggerTimelineUpdate() {
    this.trigger('updated');
  }

  private onNewTimestamp({ token, timestamp }: NewTimestampPayload) {
    this.addTimestamp(token, timestamp);
    this.triggerTimelineUpdate();
  }
}

export type NewTimestampPayload = {
  token: string;
  timestamp: Timestamp;
};

declare module '@ember/service' {
  interface Registry {
    'repos/timestamp-repository': TimestampRepository;
  }
}
