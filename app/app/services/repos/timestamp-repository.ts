import Service, { inject as service } from '@ember/service';
import Evented from '@ember/object/evented';
import { Timestamp } from 'explorviz-frontend/utils/landscape-schemes/timestamp';
import { tracked } from '@glimmer/tracking';
import TimestampPollingService from '../timestamp-polling';
import RenderingService from '../rendering-service';
import TimestampService from '../timestamp';
import TimelineDataObjectHandler from 'explorviz-frontend/utils/timeline/timeline-data-object-handler';
import { areArraysEqual } from 'explorviz-frontend/utils/helpers/array-helpers';
import { SelectedCommit } from '../commit-tree-state';

/**
 * Handles all landscape-related timestamps within the application, especially for the timelines
 *
 * @class Timestamp-Repository-Service
 * @extends Ember.Service
 */
export default class TimestampRepository extends Service.extend(Evented) {
  // #region Services

  @service('timestamp-polling')
  timestampPollingService!: TimestampPollingService;

  @service('rendering-service')
  renderingService!: RenderingService;

  @service('timestamp')
  timestampService!: TimestampService;

  // #endregion

  // #region Properties

  @tracked
  commitToTimestampMap: Map<string, Map<number, Timestamp>> = new Map();
  // <commitId, <epochMilli, timestamp>>

  private _timelineDataObjectHandler: TimelineDataObjectHandler | null = null;

  // #endregion

  // #region  Getter / Setter

  set timelineDataObjectHandler(
    newTimelineDataObjectHandler: TimelineDataObjectHandler | null
  ) {
    this._timelineDataObjectHandler = newTimelineDataObjectHandler;
  }

  get timelineDataObjectHandler(): TimelineDataObjectHandler | null {
    return this._timelineDataObjectHandler;
  }

  // #endregion

  // #region Timestamp Polling

  restartTimestampPollingAndVizUpdate(commits: SelectedCommit[]): void {
    if (this.renderingService.visualizationMode === 'runtime') {
      // reset states when going back to runtime mode
      this.commitToTimestampMap = new Map();
      this._timelineDataObjectHandler?.resetState();
      this.renderingService.resumeVisualizationUpdating();
    }

    this.timestampPollingService.resetPolling();
    this.timestampPollingService.initTimestampPollingWithCallback(
      commits,
      this.timestampPollingCallback.bind(this)
    );
  }

  stopTimestampPolling(): void {
    this.timestampPollingService.resetPolling();
  }

  timestampPollingCallback(
    commitToNewTimestampsMap: Map<string, Timestamp[]>
  ): void {
    // Short Polling Event Loop for Runtime Data

    if (!this.timelineDataObjectHandler) {
      throw new Error('Timestamp Repository needs TimelineDataObjectHandler');
    }

    const commitTimestampsToRenderMap = new Map();
    const allNewTimestampsToRender: Timestamp[] = [];

    for (const [commitId, newTimestampsForCommit] of commitToNewTimestampsMap) {
      this.addTimestamps(commitId, newTimestampsForCommit);
      this.timelineDataObjectHandler.updateTimestampsForCommit(
        this.getTimestampsForCommitId(commitId),
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

  // #region Timestamp functions

  getNextTimestampOrLatest(
    commitId: string,
    epochMilli?: number
  ): Timestamp | undefined {
    const timestampsForCommit = this.commitToTimestampMap.get(commitId);
    if (!timestampsForCommit) return undefined;

    const values = [...timestampsForCommit.values()];

    if (epochMilli === undefined) {
      return values[values.length - 1];
    }

    const index = values.findIndex(
      (timestamp) => timestamp.epochMilli === epochMilli
    );

    // Return the next timestamp if it exists, otherwise return the last timestamp
    return index >= 0 && index < values.length - 1
      ? values[index + 1]
      : values[values.length - 1];
  }

  getLatestTimestamp(commitId: string): Timestamp | undefined {
    const timestamps = this.getTimestampsForCommitId(commitId);
    return timestamps.length > 0
      ? timestamps[timestamps.length - 1]
      : undefined;
  }

  // #endregion

  // #region Helper functions

  getTimestampsForCommitId(commitId: string): Timestamp[] {
    const timestampsForCommitId = this.commitToTimestampMap.get(commitId);
    if (timestampsForCommitId) {
      return [...timestampsForCommitId.values()];
    } else {
      return [];
    }
  }

  private addTimestamps(commitId: string, timestamps: Timestamp[]) {
    if (!timestamps) {
      return;
    }
    for (const timestamp of timestamps) {
      this.addTimestamp(commitId, timestamp);
    }
    if (timestamps.length) {
      this.commitToTimestampMap = new Map(
        [...this.commitToTimestampMap.entries()].sort()
      );
    }
  }

  private addTimestamp(commitId: string, timestamp: Timestamp): void {
    const timestamps =
      this.commitToTimestampMap.get(commitId) ?? new Map<number, Timestamp>();

    timestamps.set(timestamp.epochMilli, timestamp);
    this.commitToTimestampMap.set(commitId, timestamps);
  }

  // #endregion

  // #region Reset functions

  resetState() {
    this.commitToTimestampMap = new Map();
    this.timestampService.resetState();
    this.timelineDataObjectHandler?.resetState();
    this.timelineDataObjectHandler?.triggerTimelineUpdate();
  }

  // #endregion
}

declare module '@ember/service' {
  interface Registry {
    'repos/timestamp-repository': TimestampRepository;
  }
}
