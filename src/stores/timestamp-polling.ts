import { useAuthStore } from 'explorviz-frontend/src/stores/auth';
import { SelectedCommit } from 'explorviz-frontend/src/stores/commit-tree-state';
import { useLandscapeTokenStore } from 'explorviz-frontend/src/stores/landscape-token';
import {
  DebugSnapshot,
  useDebugSnapshotRepositoryStore,
} from 'explorviz-frontend/src/stores/repos/debug-snapshot-repository';
import { useTimestampRepositoryStore } from 'explorviz-frontend/src/stores/repos/timestamp-repository';
import { useToastHandlerStore } from 'explorviz-frontend/src/stores/toast-handler';
import eventEmitter from 'explorviz-frontend/src/utils/event-emitter';
import { CROSS_COMMIT_IDENTIFIER } from 'explorviz-frontend/src/utils/evolution-schemes/evolution-data';
import { Timestamp } from 'explorviz-frontend/src/utils/landscape-schemes/timestamp';
import { create } from 'zustand';

const spanService = import.meta.env.VITE_SPAN_SERV_URL;
const vsCodeService = import.meta.env.VITE_VSCODE_SERV_URL;

export const TIMESTAMP_POLLING_START_EVENT = 'timestamp_polling_start';

interface TimestampPollingState {
  timer: NodeJS.Timeout | null;
  currentCommits: SelectedCommit[] | null;
  currentCallback:
    | ((commitToTimestampMap: Map<string, Timestamp[]>) => void)
    | null;
  initTimestampPollingWithCallback: (
    commits: SelectedCommit[],
    callback: (
      commitToTimestampMap: Map<string, Timestamp[]>,
      timestampsForDebugSnapshots?: Timestamp[]
    ) => void
  ) => void;
  resetPolling: () => void;
  manuallyPollTimestamps: () => Promise<void>;
  _startTimestampPolling: (
    commits: SelectedCommit[],
    callback: (
      commitToTimestampMap: Map<string, Timestamp[]>,
      timestampsForDebugSnapshots?: Timestamp[]
    ) => void
  ) => void;
  _pollTimestamps: (
    commits: SelectedCommit[],
    callback: (
      commitToTimestampMap: Map<string, Timestamp[]>,
      timestampsForDebugSnapshots?: Timestamp[]
    ) => void
  ) => void;
  _httpFetchTimestamps: (
    commit?: SelectedCommit,
    newestLocalTimestamp?: Timestamp
  ) => Promise<Timestamp[]>;
  _httpFetchDebugSnapshots: (
    newestLocalTimestamp?: Timestamp
  ) => Promise<DebugSnapshot[]>;
}

export const useTimestampPollingStore = create<TimestampPollingState>(
  (set, get) => ({
    timer: null,
    currentCommits: null,
    currentCallback: null,

    initTimestampPollingWithCallback: async (
      commits: SelectedCommit[],
      callback: (
        commitToTimestampMap: Map<string, Timestamp[]>,
        timestampsForDebugSnapshots?: Timestamp[]
      ) => void
    ) => {
      set({ currentCommits: commits, currentCallback: callback });
      get()._startTimestampPolling(commits, callback);
    },

    resetPolling: () => {
      if (get().timer) {
        clearTimeout(get().timer!);
      }
      set({ timer: null });
    },

    manuallyPollTimestamps: async () => {
      const { currentCommits, currentCallback } = get();
      if (currentCommits && currentCallback) {
        // TIMESTAMP_POLLING_START_EVENT not send for manual polling
        // to avoid resetting the countdown timer in the loading screen
        await get()._pollTimestamps(currentCommits, currentCallback);
      }
    },

    // private
    _startTimestampPolling: (
      commits: SelectedCommit[],
      callback: (
        commitToTimestampMap: Map<string, Timestamp[]>,
        timestampsForDebugSnapshots?: Timestamp[]
      ) => void
    ) => {
      function setIntervalImmediately(func: () => void, interval: number) {
        func();
        return setInterval(func, interval);
      }

      const pollFunction = async () => {
        // Emit event to notify that polling is starting
        eventEmitter.emit(TIMESTAMP_POLLING_START_EVENT);
        await get()._pollTimestamps(commits, callback);
      };

      set({
        timer: setIntervalImmediately(pollFunction, 10 * 1000),
      });
    },

    // private
    _pollTimestamps: async (
      commits: SelectedCommit[],
      callback: (
        commitToTimestampMap: Map<string, Timestamp[]>,
        timestampsForDebugSnapshots?: Timestamp[]
      ) => void
    ) => {
      //       if (useSnapshotTokenStore.getState().snapshotToken) {
      //         const timestamps =
      //           useSnapshotTokenStore.getState().snapshotToken!.timestamps.timestamps;
      //         callback(timestamps);
      //   }

      const polledCommitToTimestampMap: Map<string, Timestamp[]> = new Map();

      if (commits.length === 0) {
        //   No commit selected -> get all runtime behavior regardless of commit
        const commitId = CROSS_COMMIT_IDENTIFIER;
        const newestLocalTimestamp = useTimestampRepositoryStore
          .getState()
          .getLatestTimestamp(commitId);
        const newestDebugSnapshotTimestamp = useTimestampRepositoryStore
          .getState()
          .getLatestDebugSnapshotTimestamp();
        const allCommitsTimestampPromise = get()._httpFetchTimestamps(
          undefined,
          newestLocalTimestamp
        );

        await allCommitsTimestampPromise
          .then((timestamps: Timestamp[]) => {
            polledCommitToTimestampMap.set(commitId, timestamps);
          })
          .catch((error: Error) => {
            console.error(`Error on fetch of timestamps: ${error}`);
            useToastHandlerStore
              .getState()
              .showErrorToastMessage('No timestamp data could be fetched.');
            callback(new Map([[CROSS_COMMIT_IDENTIFIER, []]]));
            return;
          })
          .then(() => {
            // Snapshots are for debug landscapes only. Notice that we do not support the selection of commits at the moment (TODO: future work)
            // (therefore this code lays within the commits.length === 0 case)
            if (
              useLandscapeTokenStore.getState().token
                ?.isRequestedFromVSCodeExtension
            ) {
              const debugSnapshotTimestampsPromise =
                get()._httpFetchDebugSnapshots(newestDebugSnapshotTimestamp);
              debugSnapshotTimestampsPromise
                .then((debugSnapshots: DebugSnapshot[]) => {
                  useDebugSnapshotRepositoryStore
                    .getState()
                    .saveDebugSnapshots(
                      useLandscapeTokenStore.getState().token!.value,
                      debugSnapshots
                    );

                  const debugSnapshotTimestamps = debugSnapshots.map(
                    (ds) => ds.timestamp
                  );
                  callback(polledCommitToTimestampMap, debugSnapshotTimestamps);
                })
                .catch((error: Error) => {
                  console.error(
                    `Error on fetch of debug snapshot timestamps: ${error}`
                  );
                  callback(polledCommitToTimestampMap);
                });
            } else {
              callback(polledCommitToTimestampMap);
            }
          })
          .catch((error: Error) => {
            console.error(`Error on fetch of savepoints: ${error}`);
          });

        return;
      } else {
        for (const selectedCommit of commits) {
          const newestLocalTimestampForCommit = useTimestampRepositoryStore
            .getState()
            .getLatestTimestamp(selectedCommit.commitId);

          const promise = get()._httpFetchTimestamps(
            selectedCommit,
            newestLocalTimestampForCommit
          );

          await promise
            .then((timestamps: Timestamp[]) => {
              polledCommitToTimestampMap.set(
                selectedCommit.commitId,
                timestamps
              );
            })
            .catch((error: Error) => {
              console.error(`Error on fetch of timestamps: ${error}`);
              useToastHandlerStore
                .getState()
                .showErrorToastMessage('No timestamp data could be fetched.');
              polledCommitToTimestampMap.set(selectedCommit.commitId, []);
            });
        }
        callback(polledCommitToTimestampMap);
      }
    },

    // private
    _httpFetchTimestamps: (
      commit?: SelectedCommit,
      newestLocalTimestamp?: Timestamp
    ) => {
      return new Promise<Timestamp[]>((resolve, reject) => {
        if (!useLandscapeTokenStore.getState().token) {
          reject(new Error('No landscape token selected'));
          return;
        }

        let url = `${spanService}/v2/landscapes/${useLandscapeTokenStore.getState().token!.value}/timestamps`;

        if (newestLocalTimestamp) {
          url += `?newest=${newestLocalTimestamp.epochNano}`;
          if (commit) {
            url += `&commit=${commit.commitId}`;
          }
        }
        if (commit && !newestLocalTimestamp) {
          url += `?commit=${commit.commitId}`;
        }
        fetch(url, {
          headers: {
            Authorization: `Bearer ${useAuthStore.getState().accessToken}`,
            'Access-Control-Allow-Origin': '*',
          },
        })
          .then(async (response: Response) => {
            if (response.ok) {
              const timestamps = (await response.json()) as Timestamp[];
              resolve(timestamps);
            } else {
              reject();
            }
          })
          .catch((e) => reject(e));
      });
    },
    _httpFetchDebugSnapshots: (newestLocalTimestamp?: Timestamp) => {
      return new Promise<DebugSnapshot[]>((resolve, reject) => {
        if (!useLandscapeTokenStore.getState().token) {
          reject(new Error('No landscape token selected'));
          return;
        }

        let url = `${vsCodeService}/savepoints/${useLandscapeTokenStore.getState().token!.value}`;

        if (newestLocalTimestamp) {
          url += `?newest=${newestLocalTimestamp.epochNano}`;
        }

        fetch(url, {
          headers: {
            Authorization: `Bearer ${useAuthStore.getState().accessToken}`,
            'Access-Control-Allow-Origin': '*',
          },
        })
          .then(async (response: Response) => {
            if (response.ok) {
              const debugSnapshots = (await response.json()) as DebugSnapshot[];
              resolve(debugSnapshots);
            } else {
              reject();
            }
          })
          .catch((e) => reject(e));
      });
    },
  })
);
