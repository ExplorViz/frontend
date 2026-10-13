import { useAuthStore } from 'explorviz-frontend/src/stores/auth';
import {
  SelectedCommit,
  useCommitTreeStateStore,
} from 'explorviz-frontend/src/stores/commit-tree-state';
import { useLandscapeTokenStore } from 'explorviz-frontend/src/stores/landscape-token';
import { useRenderingServiceStore } from 'explorviz-frontend/src/stores/rendering-service';
import {
  DebugSnapshot,
  useDebugSnapshotRepositoryStore,
} from 'explorviz-frontend/src/stores/repos/debug-snapshot-repository';
import { useTimestampRepositoryStore } from 'explorviz-frontend/src/stores/repos/timestamp-repository';
import { useSnapshotTokenStore } from 'explorviz-frontend/src/stores/snapshot-token';
import {
  applyNewestCommitSelectionToState,
  markNewestCommitAutoSelectedForCurrentLandscape,
} from 'explorviz-frontend/src/utils/code-analysis-reload';
import eventEmitter from 'explorviz-frontend/src/utils/event-emitter';
import { CROSS_COMMIT_IDENTIFIER } from 'explorviz-frontend/src/utils/evolution-schemes/evolution-data';
import {
  isTimestamp,
  Timestamp,
} from 'explorviz-frontend/src/utils/landscape-schemes/timestamp';
import { create } from 'zustand';

const traceService = import.meta.env.VITE_TRACE_SERV_URL;
const vsCodeService = import.meta.env.VITE_VSCODE_SERV_URL;

export const TIMESTAMP_POLLING_START_EVENT = 'timestamp_polling_start';

interface TimestampPollingState {
  timer: NodeJS.Timeout | null;
  currentCommits: SelectedCommit[] | null;

  /** Granularity of timestamps in milliseconds */
  bucketSize: number;

  newestCommitAutoSelectedForLandscapeToken: string | null;
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
  resetState: () => void;
  restartPolling: () => void;
  setBucketSize: (value: number) => void;
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
    newestLocalTimestamp?: Timestamp,
    oldestLocalTimestamp?: Timestamp,
    size?: Number
  ) => Promise<Timestamp[]>;
  _httpFetchDebugSnapshots: (
    newestLocalTimestamp?: Timestamp
  ) => Promise<DebugSnapshot[]>;
}

export const useTimestampPollingStore = create<TimestampPollingState>(
  (set, get) => ({
    timer: null,
    currentCommits: null,
    bucketSize: 10000,
    newestCommitAutoSelectedForLandscapeToken: null,
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

    resetState: () => {
      get().resetPolling();
      set({
        currentCommits: null,
        currentCallback: null,
        newestCommitAutoSelectedForLandscapeToken: null,
      });
    },

    restartPolling: () => {
      get().resetPolling();
      useTimestampRepositoryStore.getState().resetState();
      get().initTimestampPollingWithCallback(
        get().currentCommits ?? [],
        get().currentCallback!
      );
    },

    setBucketSize: (value) => set({ bucketSize: value }),

    manuallyPollTimestamps: async () => {
      const { currentCommits, currentCallback } = get();
      if (currentCommits && currentCallback) {
        // TIMESTAMP_POLLING_START_EVENT not send for manual polling
        // to avoid resetting the countdown timer in the loading screen
        try {
          await get()._pollTimestamps(currentCommits, currentCallback);
        } catch (error) {
          console.error(error);
        }
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
        try {
          await get()._pollTimestamps(commits, callback);
        } catch (error) {
          console.error(error);
        }
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
      if (useSnapshotTokenStore.getState().snapshotSelected) {
        return;
      }

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
          newestLocalTimestamp,
          undefined
        );

        let switchedToNewestCommit = false;
        await allCommitsTimestampPromise
          .then(async (timestamps: Timestamp[]) => {
            polledCommitToTimestampMap.set(commitId, timestamps);

            // If initial runtime fetch is empty, prefer newest commit view if available.
            if (
              !newestLocalTimestamp &&
              timestamps.length === 0 &&
              useCommitTreeStateStore.getState().getSelectedCommits().size ===
                0 &&
              get().newestCommitAutoSelectedForLandscapeToken !==
                useLandscapeTokenStore.getState().token?.value
            ) {
              switchedToNewestCommit = await selectNewestCommit();
            }
          })
          .catch((error: Error) => {
            console.error(`Error on fetch of timestamps: ${error}`);
            // useToastHandlerStore
            //   .getState()
            //   .showErrorToastMessage('No timestamp data could be fetched.');
            callback(new Map([[CROSS_COMMIT_IDENTIFIER, []]]));
            return;
          })
          .then(() => {
            if (switchedToNewestCommit) {
              return;
            }
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
            newestLocalTimestampForCommit,
            undefined
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
              // useToastHandlerStore
              //   .getState()
              //   .showErrorToastMessage('No timestamp data could be fetched.');
              polledCommitToTimestampMap.set(selectedCommit.commitId, []);
            });
        }
        callback(polledCommitToTimestampMap);
      }
    },

    // private
    _httpFetchTimestamps: async (
      commit?: SelectedCommit,
      newestLocalTimestamp?: Timestamp
    ) => {
      const landscapeToken = useLandscapeTokenStore.getState().token;
      if (!landscapeToken) {
        throw new Error('No landscape token selected');
      }

      let url = new URL(
        `${traceService}/v3/landscapes/${landscapeToken.value}/timestamps`
      );

      if (commit) {
        url.searchParams.set('commit', commit.commitId);
      }

      if (newestLocalTimestamp) {
        url.searchParams.set(
          'newest',
          newestLocalTimestamp.fromUnixNano.toString()
        );
      }

      url.searchParams.set('size', get().bucketSize.toString());

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${useAuthStore.getState().accessToken}`,
          'Access-Control-Allow-Origin': '*',
        },
      });
      if (!response.ok) {
        throw new Error(`Non-ok response status ${response.status}`);
      }

      const receivedTimestamps = JSON.parse(await response.text(), (k, v) => {
        return k === 'fromUnixNano' || k === 'toUnixNano' ? BigInt(v) : v;
      });
      if (
        !Array.isArray(receivedTimestamps) ||
        !receivedTimestamps.every(isTimestamp)
      ) {
        throw new Error(`JSON fails type guard ${isTimestamp.name}`);
      }

      return receivedTimestamps;
    },

    _httpFetchDebugSnapshots: (newestLocalTimestamp?: Timestamp) => {
      return new Promise<DebugSnapshot[]>((resolve, reject) => {
        if (!useLandscapeTokenStore.getState().token) {
          return reject(new Error('No landscape token selected'));
        }

        let url = `${vsCodeService}/savepoints/${useLandscapeTokenStore.getState().token!.value}`;

        if (newestLocalTimestamp) {
          url += `?newest=${newestLocalTimestamp.fromUnixNano}`;
        }

        fetch(url, {
          headers: {
            Authorization: `Bearer ${useAuthStore.getState().accessToken}`,
            'Access-Control-Allow-Origin': '*',
          },
        })
          .then(async (response: Response) => {
            if (!response.ok) {
              return reject(
                new Error(`Non-ok response status ${response.status}`)
              );
            }
            const debugSnapshots = (await response.json()) as DebugSnapshot[];
            return resolve(debugSnapshots);
          })
          .catch((e) => reject(e));
      });
    },
  })
);

async function selectNewestCommit(): Promise<boolean> {
  if (!applyNewestCommitSelectionToState()) {
    return false;
  }

  await useRenderingServiceStore
    .getState()
    .triggerRenderingForSelectedCommits();
  markNewestCommitAutoSelectedForCurrentLandscape();
  return true;
}
