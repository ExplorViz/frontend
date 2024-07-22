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
import { SelectedCommit } from 'explorviz-frontend/utils/commit-tree/commit-tree-handler';

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
  timestamps: Map<string, Map<number, Timestamp>> = new Map();
  // <commitId, <epochMilli, timestamp>>

  private _timelineDataObjectHandler: TimelineDataObjectHandler | null = null;

  set timelineDataObjectHandler(
    newTimelineDataObjectHandler: TimelineDataObjectHandler | null
  ) {
    this._timelineDataObjectHandler = newTimelineDataObjectHandler;
  }

  get timelineDataObjectHandler() {
    return this._timelineDataObjectHandler;
  }

  restartTimestampPollingAndVizUpdate(commits: SelectedCommit[]) {
    this.timestamps = new Map();
    this._timelineDataObjectHandler?.resetState();

    this.renderingService.resumeVisualizationUpdating();

    this.timestampPollingService.initTimestampPollingWithCallback(
      commits,
      this.timestampPollingCallback.bind(this)
    );
  }

  stopTimestampPollingAndVizUpdate() {
    this.renderingService.pauseVisualizationUpdating();
    this.timestampPollingService.resetPolling();
  }

  // #region Short Polling Event Loop for Runtime Data

  timestampPollingCallback(commitToNewTimestampsMap: Map<string, Timestamp[]>) {
    if (!this.timelineDataObjectHandler) {
      throw new Error('Timestamp Repository needs TimelineDataObjectHandler');
    }

    const commitTimestampsToRenderMap = new Map();
    const allNewTimestampsToRender: Timestamp[] = [];

    for (const [commitId, newTimestampsForCommit] of commitToNewTimestampsMap) {
      this.addTimestamps(commitId, newTimestampsForCommit);
      this.timelineDataObjectHandler.updateTimestampsForCommit(
        this.getTimestamps(commitId),
        commitId
      );

      const lastSelectTimestamp =
        this.timestampService.getLatestTimestampByCommitOrFallback(commitId);

      const nextOrLatestTimestamp = this.getNextTimestampOrLatest(
        commitId,
        lastSelectTimestamp
      );

      const timestampToRender = nextOrLatestTimestamp
        ? [nextOrLatestTimestamp]
        : [];

      commitTimestampsToRenderMap.set(commitId, timestampToRender);
      allNewTimestampsToRender.pushObjects(timestampToRender);
    }

    if (this.renderingService.visualizationPaused) {
      this.timelineDataObjectHandler.triggerTimelineUpdate();
      return;
    }

    const currentlySelectedTimestamps =
      this.timelineDataObjectHandler.getAllSelectedTimestampsOfAllCommits();

    if (
      commitTimestampsToRenderMap.size > 0 &&
      !areArraysEqual(currentlySelectedTimestamps, allNewTimestampsToRender)
    ) {
      this.renderingService.triggerRenderingForGivenTimestamps(
        commitTimestampsToRenderMap
      );
    }
  }

  // #endregion

  getNextTimestampOrLatest(
    commitId: string,
    epochMilli?: number
  ): Timestamp | undefined {
    const timestampsForCommit = this.timestamps.get(commitId);
    if (timestampsForCommit) {
      let isNextTimestamp: boolean = false;
      for (const [, value] of timestampsForCommit.entries()) {
        if (isNextTimestamp) {
          return value;
        } else if (epochMilli === value.epochMilli) {
          isNextTimestamp = true;
        }
      }
      const values = [...timestampsForCommit.values()];
      return values[values.length - 1];
    }
    return undefined;
  }

  getTimestamps(commitId: string): Timestamp[] {
    const timestampsForCommitId = this.timestamps.get(commitId);
    if (timestampsForCommitId) {
      return [...timestampsForCommitId.values()];
    } else {
      return [];
    }
  }

  getLatestTimestamp(commitId: string): Timestamp | undefined {
    const timestamps = this.getTimestamps(commitId);
    if (timestamps) {
      const timestampSetAsArray = [...timestamps];
      return timestampSetAsArray[timestampSetAsArray.length - 1];
    }

    return undefined;
  }

  addTimestamps(commitId: string, timestamps: Timestamp[]) {
    if (!timestamps) {
      return;
    }
    for (const timestamp of timestamps) {
      this.addTimestamp(commitId, timestamp);
    }
    if (timestamps.length) {
      this.timestamps = new Map([...this.timestamps.entries()].sort());
    }
  }

  private addTimestamp(commitId: string, timestamp: Timestamp) {
    const timestamps = this.timestamps.get(commitId);

    if (timestamps) {
      timestamps.set(timestamp.epochMilli, timestamp);
    } else {
      const newTimestampMap = new Map<number, Timestamp>();
      newTimestampMap.set(timestamp.epochMilli, timestamp);
      this.timestamps.set(commitId, newTimestampMap);
    }
  }
}

declare module '@ember/service' {
  interface Registry {
    'repos/timestamp-repository': TimestampRepository;
  }
}
