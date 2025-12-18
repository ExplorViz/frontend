import { SelectedCommit } from 'explorviz-frontend/src/stores/commit-tree-state';
import { useTimestampStore } from 'explorviz-frontend/src/stores/timestamp';
import { useTimestampPollingStore } from 'explorviz-frontend/src/stores/timestamp-polling';
import { areArraysEqual } from 'explorviz-frontend/src/utils/helpers/array-helpers';
import { Timestamp } from 'explorviz-frontend/src/utils/landscape-schemes/timestamp';
import TimelineDataObjectHandler from 'explorviz-frontend/src/utils/timeline/timeline-data-object-handler';
import { create } from 'zustand';
import { useRenderingServiceStore } from '../rendering-service';

interface TimestampRepositoryState {
  commitToTimestampMap: Map<string, Map<number, Timestamp>>;
  timestampsForDebugSnapshots: Map<number, Timestamp>;
  _timelineDataObjectHandler: TimelineDataObjectHandler | null;
  addCommitToTimestamp: (
    commitId: string,
    timestamps: Map<number, Timestamp>
  ) => void;
  restartTimestampPollingAndVizUpdate: (commits: SelectedCommit[]) => void;
  stopTimestampPolling: () => void;
  timestampPollingCallback: (
    commitToNewTimestampsMap: Map<string, Timestamp[]>,
    timestampsForDebugSnapshots?: Timestamp[]
  ) => void;
  getNextTimestampOrLatest: (
    commitId: string,
    epochNano?: number
  ) => Timestamp | undefined;
  getLatestTimestamp: (commitId: string) => Timestamp | undefined;
  getLatestDebugSnapshotTimestamp: () => Timestamp | undefined;
  getTimestampsForCommitId: (
    commitId: string,
    includeTimestampsFromDebugSnapshots: boolean
  ) => Timestamp[];
  getTimestampsForDebugSnapshots(): Timestamp[];
  addTimestamps: (commitId: string, timestamps: Timestamp[]) => void;
  addTimestampsForDebugSnapshots: (timestamps: Timestamp[]) => void;
  addTimestamp: (commitId: string, timestamp: Timestamp) => void;
  addTimestampForDebugSnapshot: (timestamp: Timestamp) => void;
  resetState: () => void;
}

export const useTimestampRepositoryStore = create<TimestampRepositoryState>(
  (set, get) => ({
    commitToTimestampMap: new Map(), // tracked
    timestampsForDebugSnapshots: new Map(),
    _timelineDataObjectHandler: null,

    addCommitToTimestamp,

    restartTimestampPollingAndVizUpdate: (commits: SelectedCommit[]) => {
      if (useRenderingServiceStore.getState()._analysisMode === 'runtime') {
        // reset states when going back to runtime mode
        get().commitToTimestampMap = new Map();
        get().timestampsForDebugSnapshots = new Map();
        get()._timelineDataObjectHandler?.resetState();
        useRenderingServiceStore.getState().resumeVisualizationUpdating();
      }
      useTimestampPollingStore.getState().resetPolling();
      useTimestampPollingStore
        .getState()
        .initTimestampPollingWithCallback(
          commits,
          get().timestampPollingCallback.bind(get())
        );
    },

    stopTimestampPolling: () => {
      useTimestampPollingStore.getState().resetPolling();
    },

    timestampPollingCallback: (
      commitToNewTimestampsMap: Map<string, Timestamp[]>,
      timestampsForDebugSnapshots?: Timestamp[]
    ) => {
      // Short Polling Event Loop for Runtime Data

      if (!get()._timelineDataObjectHandler) {
        throw new Error('Timestamp Repository needs TimelineDataObjectHandler');
      }

      const commitTimestampsToRenderMap = new Map();
      const allNewTimestampsToRender: Timestamp[] = [];

      if (timestampsForDebugSnapshots) {
        get().addTimestampsForDebugSnapshots(timestampsForDebugSnapshots);
      }

      for (const [
        commitId,
        newTimestampsForCommit,
      ] of commitToNewTimestampsMap) {
        get().addTimestamps(commitId, newTimestampsForCommit);
        get()._timelineDataObjectHandler!.updateTimestampsForCommit(
          get().getTimestampsForCommitId(
            commitId,
            !!timestampsForDebugSnapshots
          ),
          commitId
        );

        // TODO: Why is the following within the for-loop?
        const lastSelectTimestamp = useTimestampStore
          .getState()
          .getLatestTimestampByCommitOrFallback(commitId);

        const nextOrLatestTimestamp = get().getNextTimestampOrLatest(
          commitId,
          lastSelectTimestamp
        );

        const timestampToRender = nextOrLatestTimestamp
          ? [nextOrLatestTimestamp]
          : [];

        commitTimestampsToRenderMap.set(commitId, timestampToRender);
        allNewTimestampsToRender.push(...timestampToRender);
      }

      if (useRenderingServiceStore.getState()._visualizationPaused) {
        return;
      }

      const currentlySelectedTimestamps =
        get()._timelineDataObjectHandler!.getAllSelectedTimestampsOfAllCommits();

      if (
        commitTimestampsToRenderMap.size > 0 &&
        !areArraysEqual(currentlySelectedTimestamps, allNewTimestampsToRender)
      ) {
        console.log(
          '[timestampPollingCallback] about to triggerRenderingForGivenTimestamps with:',
          Array.from(commitTimestampsToRenderMap.entries()).map(
            ([commitId, ts]) => ({ commitId, count: ts.length })
          )
        );
        useRenderingServiceStore
          .getState()
          .triggerRenderingForGivenTimestamps(commitTimestampsToRenderMap);
      }
    },

    getNextTimestampOrLatest: (commitId: string, epochNano?: number) => {
      const timestampsForCommit = get().commitToTimestampMap.get(commitId);
      if (!timestampsForCommit) return undefined;

      const values = [...timestampsForCommit.values()];

      if (epochNano === undefined) {
        return values[values.length - 1];
      }

      const index = values.findIndex(
        (timestamp) => timestamp.epochNano === epochNano
      );

      // Return the next timestamp if it exists, otherwise return the last timestamp
      return index >= 0 && index < values.length - 1
        ? values[index + 1]
        : values[values.length - 1];
    },

    getLatestTimestamp: (commitId: string) => {
      const timestamps = get().getTimestampsForCommitId(commitId, false);
      return timestamps.length > 0
        ? timestamps[timestamps.length - 1]
        : undefined;
    },

    getLatestDebugSnapshotTimestamp: () => {
      const timestamps = get().getTimestampsForDebugSnapshots();
      return timestamps.length > 0
        ? timestamps[timestamps.length - 1]
        : undefined;
    },

    getTimestampsForCommitId: (
      commitId: string,
      includeTimestampsFromDebugSnapshots: boolean = false
    ) => {
      const timestampsForCommitId = get().commitToTimestampMap.get(commitId);
      const timestampsForDebugSnapshots =
        get().getTimestampsForDebugSnapshots();

      if (timestampsForCommitId && !includeTimestampsFromDebugSnapshots) {
        return [...timestampsForCommitId.values()];
      } else if (timestampsForCommitId && includeTimestampsFromDebugSnapshots) {
        return [
          ...timestampsForCommitId.values(),
          ...timestampsForDebugSnapshots,
        ].sort((a, b) => a.epochNano - b.epochNano);
      } else if (
        !timestampsForCommitId &&
        includeTimestampsFromDebugSnapshots
      ) {
        return timestampsForDebugSnapshots;
      } else {
        return [];
      }
    },

    getTimestampsForDebugSnapshots: () => {
      return [...get().timestampsForDebugSnapshots.values()];
    },

    addTimestamps: (commitId: string, timestamps: Timestamp[]) => {
      if (!timestamps) {
        return;
      }
      for (const timestamp of timestamps) {
        get().addTimestamp(commitId, timestamp);
      }
      if (timestamps.length) {
        set({
          commitToTimestampMap: new Map(
            [...get().commitToTimestampMap.entries()].sort()
          ),
        });
      }
    },

    addTimestampsForDebugSnapshots: (timestamps: Timestamp[]) => {
      for (const timestamp of timestamps) {
        get().addTimestampForDebugSnapshot(timestamp);
      }
      if (timestamps.length) {
        set({
          timestampsForDebugSnapshots: new Map(
            [...get().timestampsForDebugSnapshots.entries()].sort()
          ),
        });
      }
    },

    addTimestamp: (commitId: string, timestamp: Timestamp) => {
      const timestamps =
        get().commitToTimestampMap.get(commitId) ??
        new Map<number, Timestamp>();

      timestamps.set(timestamp.epochNano, timestamp);
      get().addCommitToTimestamp(commitId, timestamps);
    },

    addTimestampForDebugSnapshot: (timestamp: Timestamp) => {
      get().timestampsForDebugSnapshots.set(timestamp.epochNano, timestamp);
    },

    resetState: () => {
      get().commitToTimestampMap = new Map();
      get().timestampsForDebugSnapshots = new Map();
      useTimestampStore.getState().resetState();
      get()._timelineDataObjectHandler?.resetState();
      /*useRenderingServiceStore.setState((state) => ({
        timelineUpdateVersion: state.timelineUpdateVersion + 1,
      }));*/
    },
  })
);

function addCommitToTimestamp(
  commitId: string,
  timestamps: Map<number, Timestamp>
) {
  useTimestampRepositoryStore.setState((prev) => ({
    commitToTimestampMap: new Map(prev.commitToTimestampMap).set(
      commitId,
      timestamps
    ),
  }));
}
