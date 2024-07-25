import Service, { inject as service } from '@ember/service';
import Evented from '@ember/object/evented';
import debugLogger from 'ember-debug-logger';
import { Timestamp } from 'explorviz-frontend/utils/landscape-schemes/timestamp';
import { tracked } from '@glimmer/tracking';
import TimestampPollingService from '../timestamp-polling';
import RenderingService from '../rendering-service';
import TimestampService from '../timestamp';
import TimelineDataObjectHandler from 'explorviz-frontend/utils/timeline/timeline-data-object-handler';
import { areArraysEqual } from 'explorviz-frontend/utils/helpers/array-helpers';

/**
 * Handles all landscape-related timestamps within the application, especially for the timelines
 *
 * @class Timestamp-Repository-Service
 * @extends Ember.Service
 */
export default class TimestampRepository extends Service.extend(Evented) {
  private debug = debugLogger('TimestampRepository');

  @service('timestamp-polling')
  timestampPollingService!: TimestampPollingService;

  @service('rendering-service')
  renderingService!: RenderingService;

  @service('timestamp')
  timestampService!: TimestampService;

  @tracked
  timestamps: Map<number, Timestamp> = new Map();

  private _timelineDataObjectHandler: TimelineDataObjectHandler | null = null;

  set timelineDataObjectHandler(
    newTimelineDataObjectHandler: TimelineDataObjectHandler | null
  ) {
    this._timelineDataObjectHandler = newTimelineDataObjectHandler;
  }

  get timelineDataObjectHandler() {
    return this._timelineDataObjectHandler;
  }

  restartTimestampPollingAndVizUpdate() {
    this.timestamps = new Map();
    this._timelineDataObjectHandler?.resetState();

    this.renderingService.resumeVisualizationUpdating();

    this.timestampPollingService.initTimestampPollingWithCallback(
      this.timestampPollingCallback.bind(this)
    );
  }

  stopTimestampPollingAndVizUpdate() {
    this.renderingService.pauseVisualizationUpdating();
    this.timestampPollingService.resetPolling();
  }

  // #region Short Polling Event Loop for Runtime Data

  timestampPollingCallback(timestamps: Timestamp[]): void {
    if (!this.timelineDataObjectHandler) {
      throw new Error('Timestamp Repository needs TimelineDataObjectHandler');
    }

    this.addTimestamps(timestamps);

    this.timelineDataObjectHandler.updateTimestamps();

    if (this.renderingService.visualizationPaused) {
      this.timelineDataObjectHandler.triggerTimelineUpdate();
      return;
    }

    const lastSelectTimestamp = this.timestampService.timestamp;

    const timestampToRender =
      this.getNextTimestampOrLatest(lastSelectTimestamp);

    if (
      timestampToRender &&
      !areArraysEqual(this.timelineDataObjectHandler.selectedTimestamps, [
        timestampToRender,
      ])
    ) {
      this.renderingService.triggerRenderingForGivenTimestamp(
        timestampToRender.epochMilli,
        [timestampToRender]
      );
    }
  }

  // #endregion

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
